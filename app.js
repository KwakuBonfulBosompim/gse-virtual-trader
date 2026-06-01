// --- Cloud Database Configuration Hub ---
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTmHsSoHFg3NIEDhUW2FCQPfoM-OSaQqmhtO19JOGbGAOX8-9AHQYE-Aeg1JkaL3_l-wJVP_nMOqsQZ/pub?output=csv"; 

let marketData = [];
let userAccount = JSON.parse(localStorage.getItem('gse_trader_account')) || {
    cash: 50000.00,
    holdings: {}
};

const STATUTORY_FEE_RATE = 0.018; 

// Master Sector & Name Mapping Dictionary
const gseRegistry = {
    "ACCESS": { name: "Access Bank Ghana PLC", sector: "Finance" },
    "ADB": { name: "Agricultural Development Bank", sector: "Finance" },
    "CAL": { name: "CalBank PLC", sector: "Finance" },
    "EGH": { name: "Ecobank Ghana PLC", sector: "Finance" },
    "ETI": { name: "Ecobank Transnational Inc.", sector: "Finance" },
    "FAB": { name: "First Atlantic Bank PLC", sector: "Finance" },
    "GCB": { name: "GCB Bank PLC", sector: "Finance" },
    "MAC": { name: "Mega African Capital PLC", sector: "Finance" },
    "RBGH": { name: "Republic Bank Ghana PLC", sector: "Finance" },
    "SCB": { name: "Standard Chartered Bank Ghana", sector: "Finance" },
    "SCBPREF": { name: "Stanchart Preference Shares", sector: "Finance" },
    "SOGEGH": { name: "Societe Generale Ghana PLC", sector: "Finance" },
    "TBL": { name: "Trust Bank Ltd (Gambia)", sector: "Finance" },
    "CPC": { name: "Cocoa Processing Co. PLC", sector: "Food & Beverage" },
    "FML": { name: "Fan Milk PLC", sector: "Food & Beverage" },
    "GGBL": { name: "Guinness Ghana Breweries PLC", sector: "Food & Beverage" },
    "HORDS": { name: "Hords PLC", sector: "Food & Beverage" },
    "SAMBA": { name: "Samba Foods PLC", sector: "Food & Beverage" },
    "CLYD": { name: "Clydestone Ghana PLC", sector: "ICT" },
    "MTNGH": { name: "Scancom PLC (MTN Ghana)", sector: "ICT" },
    "EGL": { name: "Enterprise Group PLC", sector: "Insurance" },
    "SIC": { name: "SIC Insurance Company PLC", sector: "Insurance" },
    "CMLT": { name: "Camelot Ghana PLC", sector: "Manufacturing" },
    "DASPHARMA": { name: "Dannex Ayrton Starwin PLC", sector: "Manufacturing" },
    "IIL": { name: "Intravenous Infusions Ltd", sector: "Manufacturing" },
    "UNIL": { name: "Unilever Ghana PLC", sector: "Manufacturing" },
    "ALW": { name: "Aluworks PLC", sector: "Manufacturing" },
    "AADS": { name: "AngloGold Ashanti Depository", sector: "Mining & Energy" },
    "AGA": { name: "AngloGold Ashanti PLC", sector: "Mining & Energy" },
    "ALLGH": { name: "Atlantic Lithium Ltd", sector: "Mining & Energy" },
    "ASG": { name: "Asante Gold Corporation", sector: "Mining & Energy" },
    "TLW": { name: "Tullow Oil PLC", sector: "Mining & Energy" },
    "TLWT": { name: "Tullow Oil PLC", sector: "Mining & Energy" },
    "BOPP": { name: "Benso Oil Palm Plantation", sector: "Agriculture" },
    "GOIL": { name: "Ghana Oil Company PLC", sector: "Distribution" },
    "TOTAL": { name: "TotalEnergies Marketing Ghana", sector: "Distribution" },
    "PBC": { name: "Produce Buying Company Ltd", sector: "Distribution" },
    "GLD": { name: "NewGold ETF", sector: "Exchange Traded Funds" },
    "MMH": { name: "Meridian Marshalls Holding", sector: "Education" },
    "DIGICUT": { name: "Digicut Production & Adv.", sector: "Advertising" }
};

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

function parseCSVData(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return useFallbackData();

    const cleanMarketData = [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const tickerIdx = headers.indexOf('ticker');
    const priceIdx = headers.indexOf('price');
    const changeIdx = headers.indexOf('change');

    // List of words to skip if they appear in your ticker column
    const badRowsFilter = ["AVERAGE", "FINANCE", "FOOD AND BEVERAGE", "ICT", "INSURANCE", "MANUFACTURING", "MINING", "AGRICULTURE", "DISTRIBUTION", "EXCHANGE TRADED FUNDS", "EDUCATION", "ADV. & PRODUCTION", "LIST OF GSE"];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const columns = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        
        if (columns[tickerIdx]) {
            let rawTicker = columns[tickerIdx].toUpperCase().replace(/\*/g, '').trim();
            
            // SECURITY FILTER: Skip calculations, label headers, or empty/zero placeholder rows
            if (badRowsFilter.includes(rawTicker) || rawTicker === "" || columns[priceIdx] === "#DIV/0!") {
                continue; 
            }

            // Only map tickers explicitly defined in our official registry dictionary
            if (gseRegistry[rawTicker]) {
                let rawPrice = columns[priceIdx] ? columns[priceIdx].replace(/[^\d.-]/g, '') : "0";
                let parsedPrice = parseFloat(rawPrice) || 0.00;

                // Skip rows that failed to load real values
                if (parsedPrice === 0) continue;

                cleanMarketData.push({
                    ticker: rawTicker,
                    name: gseRegistry[rawTicker].name,
                    sector: gseRegistry[rawTicker].sector,
                    price: parsedPrice,
                    change: columns[changeIdx] || "0.00%"
                });
            }
        }
    }

    if (cleanMarketData.length > 0) {
        // Sort alphabetically by sector name
        marketData = cleanMarketData.sort((a, b) => a.sector.localeCompare(b.sector));
        updateUI();
    } else {
        useFallbackData();
    }
}

function useFallbackData() {
    marketData = [
        { ticker: "MTNGH", name: "Scancom PLC (MTN Ghana)", sector: "ICT", price: 4.34, change: "-0.02%" },
        { ticker: "GCB", name: "GCB Bank PLC", sector: "Finance", price: 15.62, change: "+0.02%" }
    ];
    updateUI();
}

function saveAccount() {
    localStorage.setItem('gse_trader_account', JSON.stringify(userAccount));
    updateUI();
}

function updateUI() {
    document.getElementById('cash-display').innerText = `GHS ${userAccount.cash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const marketTable = document.getElementById('market-table');
    const stockSelect = document.getElementById('stock-select');
    
    if(!marketTable || !stockSelect) return;
    
    marketTable.innerHTML = "";
    stockSelect.innerHTML = "";

    let totalPortfolioValue = 0;
    let currentSector = "";

    marketData.forEach(stock => {
        // REMOVED "SECTION:" WORDING: Injects clean header rows dynamically
        if (stock.sector !== currentSector) {
            currentSector = stock.sector;
            marketTable.innerHTML += `
                <tr style="background-color: #0d1b2a; font-weight: bold;">
                    <td colspan="4" style="color: #ffffff; padding: 8px 12px; font-size: 12px; letter-spacing: 0.5px;">${currentSector.toUpperCase()}</td>
                </tr>
            `;
        }

        const changeClass = stock.change.startsWith("+") ? "positive" : stock.change.startsWith("-") ? "negative" : "";
        
        // Show prices cleanly formatted with currency symbols
        let displayPrice = stock.price > 0 ? `GHS ${stock.price.toFixed(2)}` : "GHS 0.00";

        marketTable.innerHTML += `
            <tr>
                <td><strong>${stock.ticker}</strong></td>
                <td>${stock.name}</td>
                <td>${displayPrice}</td>
                <td class="${changeClass}">${stock.change}</td>
            </tr>
        `;
        
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
        holdingsTable.innerHTML = `<tr><td colspan="5" style="color: #64748b; text-align: center; padding: 20px;">No open positions. Use the terminal selection menu to trade.</td></tr>`;
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

function executeTrade() {
    const direction = document.getElementById('action-type').value;
    const ticker = document.getElementById('stock-select').value;
    const qty = parseInt(document.getElementById('share-quantity').value);
    
    if(!qty || qty <= 0) return alert("Please specify a valid share volume.");
    
    const targetStock = marketData.find(s => s.ticker === ticker);
    if (!targetStock) return alert("System tracking mismatch error.");
    
    const principalValue = qty * targetStock.price;
    const dynamicLevies = principalValue * STATUTORY_FEE_RATE;

    if (direction === "BUY") {
        const aggregatedCost = principalValue + dynamicLevies;
        if(aggregatedCost > userAccount.cash) {
            return alert(`Insufficient cash. Total cost is GHS ${aggregatedCost.toFixed(2)} (including 1.8% transaction clearing fees).`);
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
            return alert("Order Rejected: Insufficient inventory balance.");
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

fetchMarketData();
