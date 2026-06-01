// --- Configuration Strategy ---
// Replace the URL below with your public Google Sheet CSV export link when ready
const GOOGLE_SHEET_CSV_URL = ""; 

// Default local market fallback data if Google Sheet isn't linked yet
let marketData = [
    { ticker: "MTNGH", name: "Scancom PLC (MTN)", price: 2.35, change: "+0.43%" },
    { ticker: "GCB", name: "GCB Bank PLC", price: 5.90, change: "-1.10%" },
    { ticker: "EGH", name: "Ecobank Ghana", price: 6.40, change: "0.00%" },
    { ticker: "TOTAL", name: "TotalEnergies Marketing Ghana", price: 9.50, change: "+1.20%" }
];

// User portfolio state (stored in local browser memory)
let userAccount = JSON.parse(localStorage.getItem('gse_trader_account')) || {
    cash: 50000.00,
    holdings: {} // Format: { "MTNGH": { shares: 1000, totalCost: 2350 } }
};

const FEE_RATE = 0.018; // 1.8% local transaction fee structure

function saveAccount() {
    localStorage.setItem('gse_trader_account', JSON.stringify(userAccount));
    updateUI();
}

function updateUI() {
    // Render Account Metrics
    document.getElementById('cash-display').innerText = `GHS ${userAccount.cash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Render Market Board & Order Form Options
    const marketTable = document.getElementById('market-table');
    const stockSelect = document.getElementById('stock-select');
    marketTable.innerHTML = "";
    stockSelect.innerHTML = "";

    let totalPortfolioValue = 0;

    marketData.forEach(stock => {
        // Market Board Row
        const changeClass = stock.change.startsWith("+") ? "positive" : stock.change.startsWith("-") ? "negative" : "";
        marketTable.innerHTML += `
            <tr>
                <td><strong>${stock.ticker}</strong></td>
                <td>${stock.name}</td>
                <td>${stock.price.toFixed(2)}</td>
                <td class="${changeClass}">${stock.change}</td>
            </tr>
        `;
        // Select Options
        stockSelect.innerHTML += `<option value="${stock.ticker}">${stock.ticker} (GHS ${stock.price.toFixed(2)})</option>`;
        
        // Calculate dynamic valuation of assets held
        if(userAccount.holdings[stock.ticker]) {
            totalPortfolioValue += userAccount.holdings[stock.ticker].shares * stock.price;
        }
    });

    document.getElementById('portfolio-display').innerText = `GHS ${totalPortfolioValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Render Holdings Table
    const holdingsTable = document.getElementById('holdings-table');
    holdingsTable.innerHTML = "";
    
    const heldTickers = Object.keys(userAccount.holdings);
    if(heldTickers.length === 0) {
        holdingsTable.innerHTML = `<tr><td colspan="5" style="color: #64748b; text-align:center;">No open positions.</td></tr>`;
    } else {
        heldTickers.forEach(ticker => {
            const holding = userAccount.holdings[ticker];
            if(holding.shares > 0) {
                const currentStock = marketData.find(s => s.ticker === ticker);
                const currentVal = holding.shares * currentStock.price;
                const profitLoss = currentVal - holding.totalCost;
                const plClass = profitLoss >= 0 ? "positive" : "negative";
                const plSign = profitLoss >= 0 ? "+" : "";

                holdingsTable.innerHTML += `
                    <tr>
                        <td><strong>${ticker}</strong></td>
                        <td>${holding.shares}</td>
                        <td>${(holding.totalCost / holding.shares).toFixed(2)}</td>
                        <td>GHS ${currentVal.toFixed(2)}</td>
                        <td class="${plClass}">${plSign}${profitLoss.toFixed(2)}</td>
                    </tr>
                `;
            }
        });
    }
}

function executeTrade() {
    const action = document.getElementById('action-type').value;
    const ticker = document.getElementById('stock-select').value;
    const qty = parseInt(document.getElementById('share-quantity').value);
    
    if(!qty || qty <= 0) return alert("Please enter a valid share quantity.");
    
    const stock = marketData.find(s => s.ticker === ticker);
    const grossPrincipal = qty * stock.price;
    const transactionFees = grossPrincipal * FEE_RATE;

    if (action === "BUY") {
        const totalCost = grossPrincipal + transactionFees;
        if(totalCost > userAccount.cash) return alert("Insufficient virtual funds to clear transaction fees and principal.");
        
        userAccount.cash -= totalCost;
        if(!userAccount.holdings[ticker]) {
            userAccount.holdings[ticker] = { shares: 0, totalCost: 0 };
        }
        userAccount.holdings[ticker].shares += qty;
        userAccount.holdings[ticker].totalCost += totalCost;
    } 
    else if (action === "SELL") {
        if(!userAccount.holdings[ticker] || userAccount.holdings[ticker].shares < qty) {
            return alert("Order Rejected: You do not hold enough shares to execute this sale.");
        }
        const netProceeds = grossPrincipal - transactionFees;
        userAccount.cash += netProceeds;
        
        // Adjust cost basis down proportionally
        const costPerShareOld = userAccount.holdings[ticker].totalCost / userAccount.holdings[ticker].shares;
        userAccount.holdings[ticker].shares -= qty;
        userAccount.holdings[ticker].totalCost -= (costPerShareOld * qty);
    }

    document.getElementById('share-quantity').value = "";
    saveAccount();
}

// Initial Boot Interface Run
updateUI();