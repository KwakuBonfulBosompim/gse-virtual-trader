// --- Cloud Database Configuration Hub ---
// Connected to your live GSE Equities Sheet
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTmHsSoHFg3NIEDhUW2FCQPfoM-OSaQqmhtO19JOGbGAOX8-9AHQYE-Aeg1JkaL3_l-wJVP_nMOqsQZ/pub?output=csv"; 

// Default local structural baseline (Factoring in realistic valuations if connection fails)
let marketData = [
    { ticker: "MTNGH", name: "Scancom PLC (MTN)", price: 6.50, change: "-0.15%" },
    { ticker: "GCB", name: "GCB Bank Limited", price: 35.25, change: "-2.08%" },
    { ticker: "EGH", name: "Ecobank Ghana Limited", price: 48.00, change: "0.00%" },
    { ticker: "TOTAL", name: "TotalEnergies Marketing Ghana", price: 33.00, change: "+1.15%" },
    { ticker: "ACCESS", name: "Access Bank Ghana", price: 27.60, change: "+0.00%" }
];

// User account instance persistence (Utilizing local sandbox browser memory)
let userAccount = JSON.parse(localStorage.getItem('gse_trader_account')) || {
    cash: 50000.00,
    holdings: {} // Format structure: { "MTNGH": { shares: 500, totalCost: 3250 } }
};

const STATUTORY_FEE_RATE = 0.018; // 1.8% baseline transactional clearing levy per execution block

function saveAccount() {
    localStorage.setItem('gse_trader_account', JSON.stringify(userAccount));
    updateUI();
}

function updateUI() {
    // Refresh Account Balances
    document.getElementById('cash-display').innerText = `GHS ${userAccount.cash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Refresh Tables and Selections
    const marketTable = document.getElementById('market-table');
    const stockSelect = document.getElementById('stock-select');
    marketTable.innerHTML = "";
    stockSelect.innerHTML = "";

    let totalPortfolioValue = 0;

    marketData.forEach(stock => {
        // Appending Interactive Rows to Live Board
        const changeClass = stock.change.startsWith("+") ? "positive" : stock.change.startsWith("-") ? "negative" : "";
        marketTable.innerHTML += `
            <tr>
                <td><strong>${stock.ticker}</strong></td>
                <td>${stock.name}</td>
                <td>GHS ${stock.price.toFixed(2)}</td>
                <td class="${changeClass}">${stock.change}</td>
            </tr>
        `;
        
        // Appending Ticker Options to Dropdown Menu
        stockSelect.innerHTML += `<option value="${stock.ticker}">${stock.ticker} (GHS ${stock.price.toFixed(2)})</option>`;
        
        // Aggregate open portfolio position metrics
        if(userAccount.holdings[stock.ticker]) {
            totalPortfolioValue += userAccount.holdings[stock.ticker].shares * stock.price;
        }
    });

    document.getElementById('portfolio-display').innerText = `GHS ${totalPortfolioValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Re-rendering User Asset Table
    const holdingsTable = document.getElementById('holdings-table');
    holdingsTable.innerHTML = "";
    
    const heldAssets = Object.keys(userAccount.holdings).filter(t => userAccount.holdings[t].shares > 0);
    
    if(heldAssets.length === 0) {
        holdingsTable.innerHTML = `<tr><td colspan="5" style="color: #64748b; text-align: center; padding: 20px;">No active open positions. Execute a buy order above to start practicing.</td></tr>`;
    } else {
        heldAssets.forEach(ticker => {
            const holding = userAccount.holdings[ticker];
            const marketStock = marketData.find(s => s.ticker === ticker);
            
            // Safety handler if market ticker modifications occur
            if (!marketStock) return;

            const valuation = holding.shares * marketStock.price;
            const netReturn = valuation - holding.totalCost;
            const plClass = netReturn >= 0 ? "positive" : "negative";
            const prefixSign = netReturn >= 0 ? "+" : "";

            holdingsTable.innerHTML += `
                <tr>
                    <td><strong>${ticker}</strong></td>
                    <td>${holding.shares.toLocaleString()}</td>
                    <td>GHS ${(holding.totalCost / holding.shares).toFixed(2)}</td>
                    <td>GHS ${valuation.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td class="${plClass}">${prefixSign}GHS ${netReturn.toFixed(2)}</td>
                </tr>
            `;
        });
    }
}

function executeTrade() {
    const direction = document.getElementById('action-type').value;
    const ticker = document.getElementById('stock-select').value;
    const qty = parseInt(document.getElementById('share-quantity').value);
    
    if(!qty || qty <= 0) return alert("Validation Error: Please specify a valid positive share volume.");
    
    const targetStock = marketData.find(s => s.ticker === ticker);
    const principalValue = qty * targetStock.price;
    const dynamicLevies = principalValue * STATUTORY_FEE_RATE;

    if (direction === "BUY") {
        const aggregatedCost = principalValue + dynamicLevies;
        if(aggregatedCost > userAccount.cash) {
            return alert(`Order Rejected: Insufficient liquidity. Total transaction cost is GHS ${aggregatedCost.toFixed(2)} (including clearing fees).`);
        }
        
        userAccount.cash -= aggregatedCost;
        if(!userAccount.holdings[ticker]) {
            userAccount.holdings[ticker] = { shares: 0, totalCost: 0 };
        }
        userAccount.holdings[ticker].shares += qty;
        userAccount.holdings[ticker].totalCost += aggregatedCost;
    } 
    else if (direction === "SELL") {
        if(!userAccount.holdings[ticker] || userAccount.holdings[ticker].shares < qty) {
            return alert("Order Rejected: Market execution denied due to insufficient asset inventory balances.");
        }
        const netCashLiquidation = principalValue - dynamicLevies;
        userAccount.cash += netCashLiquidation;
        
        // Scaled cost basis decrement logic
        const historicCostPerShare = userAccount.holdings[ticker].totalCost / userAccount.holdings[ticker].shares;
        userAccount.holdings[ticker].shares -= qty;
        userAccount.holdings[ticker].totalCost -= (historicCostPerShare * qty);
    }

    // Resetting Inputs and Saving State
    document.getElementById('share-quantity').value = "";
    saveAccount();
}

// Initial Core Run Environment
updateUI();
