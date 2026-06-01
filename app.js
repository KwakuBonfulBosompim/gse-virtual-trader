// --- Cloud Database Configuration Hub ---
// Connected directly to your live GSE 'Daily Share prices' tab
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTmHsSoHFg3NIEDhUW2FCQPfoM-OSaQqmhtO19JOGbGAOX8-9AHQYE-Aeg1JkaL3_l-wJVP_nMOqsQZ/pub?gid=245582917&single=true&output=csv"; 

let marketData = [];
let userAccount = JSON.parse(localStorage.getItem('gse_trader_account')) || {
    cash: 50000.00,
    holdings: {}
};

const STATUTORY_FEE_RATE = 0.018; // 1.8% standard local clearing levy (brokerage, GSE, SEC fees)

// Asynchronous Data Pipeline Engine
async function fetchMarketData() {
    try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const csvText = await response.text();
        parseCSVData(csvText);
    } catch (error) {
        console.error("Database connection failure:", error);
        useFallbackData();
    }
}

// Dynamic CSV Parser Matrix
function parseCSVData(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return useFallbackData();

    const cleanMarketData = [];
    
    // Automatically match column positions by scanning Row 1 header text labels
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const sectorIdx = headers.indexOf('sector');
    const tickerIdx = headers.indexOf('ticker');
    const nameIdx = headers.indexOf('company name');
    const priceIdx = headers.indexOf('closing price - vwap (gh¢)');

    // Infrastructure filter to intercept text summaries, total calculations, or headers
    const badRowsFilter = ["AVERAGE", "TOTAL", "SUBTOTAL", "#DIV/0!", "LIST OF GSE", "COMPANYNAMEBYSECTORSFINANCE", "COMPANY NAMESBY SECTORSFINANCE", ""];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Split rows safely by comma while keeping phrases inside quotation marks grouped
        const columns = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        
        if (columns[tickerIdx]) {
            let rawTicker = columns[tickerIdx].toUpperCase().replace(/\*/g, '').trim();
            let rawSector = columns[sectorIdx] ? columns[sectorIdx].trim() : "Unclassified";
            let rawName = columns[nameIdx] ? columns[nameIdx].trim() : "Listed Asset";
            
            // Bypass filtering system checks to catch empty metrics or system calculation artifacts
            if (badRowsFilter.includes(rawTicker) || badRowsFilter.includes(rawSector.toUpperCase()) || rawTicker === "") {
                continue; 
            }

            // Extract numeric values from pricing cells (strip 'GHS', commas, etc.)
            let rawPrice = columns[priceIdx] ? columns[priceIdx].replace(/[^\d.-]/g, '') : "0";
            let parsedPrice = parseFloat(rawPrice) || 0.00;

            // Discard unpopulated assets or formula calculation errors
            if (parsedPrice === 0 || columns[priceIdx] === "#DIV/0!") continue;

            cleanMarketData.push({
                ticker: rawTicker,
                name: rawName,
                sector: rawSector,
                price: parsedPrice
            });
        }
    }

    if (cleanMarketData.length > 0) {
        // Alphabetically organize everything uniformly using your spreadsheet sectors
        marketData = cleanMarketData.sort((a, b) => a.sector.localeCompare(b.sector));
        updateUI();
    } else {
        useFallbackData();
    }
}

// Resilient network connectivity fallback dataset
function useFallbackData() {
    marketData = [
        { ticker: "MTNGH", name: "Scancom PLC (MTN Ghana)", sector: "ICT", price: 4.34 },
        { ticker: "GCB", name: "GCB Bank PLC", sector: "Finance", price: 15.62 }
    ];
    updateUI();
}

function saveAccount() {
    localStorage.setItem('gse_trader_account', JSON.stringify(userAccount));
    updateUI();
}

// User Interface Injection Matrix
function updateUI() {
    // Format local financial figures safely
    document.getElementById('cash-display').innerText = `GHS ${userAccount.cash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const marketTable = document.getElementById('market-table');
    const stockSelect = document.getElementById('stock-select');
    
    if(!marketTable || !stockSelect) return;
    
    marketTable.innerHTML = "";
    stockSelect.innerHTML = "";

    let totalPortfolioValue = 0;
    let currentSector = "";

    marketData.forEach(stock => {
        // Dynamic Sector Separation Banners (Cleanly removed old "SECTION:" text)
        if (stock.sector.toUpperCase() !== currentSector.toUpperCase()) {
            currentSector = stock.sector;
            marketTable.innerHTML += `
                <tr style="background-color: #0d1b2a; font-weight: bold;">
                    <td colspan="4" style="color: #ffffff; padding: 8px 12px; font-size: 12px; letter-spacing: 0.5px;">${currentSector.toUpperCase()}</td>
                </tr>
            `;
        }

        // Draw clean corporate metrics inside table rows
        marketTable.innerHTML += `
            <tr>
                <td><strong>${stock.ticker}</strong></td>
                <td>${stock.name}</td>
                <td>GHS ${stock.price.toFixed(2)}</td>
                <td>--</td> 
            </tr>
        `;
        
        // Feed real-time choices into trading select terminal dropdown
        stockSelect.innerHTML += `<option value="${stock.ticker}">${stock.ticker} - ${stock.name} (GHS ${stock.price.toFixed(2)})</option>`;
        
        if(userAccount.holdings[stock.ticker]) {
            totalPortfolioValue += userAccount.holdings[stock.ticker].shares * stock.price;
        }
    });

    document.getElementById('portfolio-display').innerText = `GHS ${totalPortfolioValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const holdingsTable = document.getElementById('holdings-table');
    holdingsTable.innerHTML = "";
    
    const heldAssets = Object.keys(userAccount.holdings).filter(t => userAccount.holdings[t].shares > 0);
    
    if(heldAssets.length === 0) {
        holdingsTable.innerHTML = `<tr><td colspan="5" style="color: #64748b; text-align: center; padding: 20px;">No open positions. Use the execution panel to execute trades.</td></tr>`;
    } else {
        heldAssets.forEach(ticker => {
            const holding = userAccount.holdings[ticker];
            const marketStock = marketData.find(s => s.ticker === ticker);
            
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

// Core Execution Routing Mechanics
function executeTrade() {
    const direction = document.getElementById('action-type').value;
    const ticker = document.getElementById('stock-select').value;
    const qty = parseInt(document.getElementById('share-quantity').value);
    
    if(!qty || qty <= 0) return alert("Please specify a valid share volume.");
    
    const targetStock = marketData.find(s => s.ticker === ticker);
    if (!targetStock) return alert("System transaction lookup error.");
    
    const principalValue = qty * targetStock.price;
    const dynamicLevies = principalValue * STATUTORY_FEE_RATE;

    if (direction === "BUY") {
        const aggregatedCost = principalValue + dynamicLevies;
        if(aggregatedCost > userAccount.cash) {
            return alert(`Insufficient cash liquidity. Total order cost is GHS ${aggregatedCost.toFixed(2)} (including clearing levies).`);
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
            return alert("Order Rejected: Insufficient inventory asset balance.");
        }
        const netCashLiquidation = principalValue - dynamicLevies;
        userAccount.cash += netCashLiquidation;
        
        const historicCostPerShare = userAccount.holdings[ticker].totalCost / userAccount.holdings[ticker].shares;
        userAccount.holdings[ticker].shares -= qty;
        userAccount.holdings[ticker].totalCost -= (historicCostPerShare * qty);
    }

    document.getElementById('share-quantity').value = "";
    saveAccount();
}

// Initializing Platform Lifecycle Hook
fetchMarketData();
