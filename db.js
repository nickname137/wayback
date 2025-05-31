
document.addEventListener("DOMContentLoaded", () => {

    //send to background.js
    async function sender(obj) {    

        try {

            const { result } = await chrome.runtime.sendMessage(obj);
            console.log(result);
            return result;

        } catch(e) {

            console.log(e);   
            return false;

        }
    }

    //DB
    const dbName = "wayback";
    const storeName = "items";
    const dbRequest = indexedDB.open(dbName);

    //URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialCollection = urlParams.get("collection");

    //Control
    const collectionFilter = document.getElementById("collectionFilter");
    const deleteCollection = document.querySelector('#deleteCollection');  
    const clearDB = document.querySelector('#clearDB');
    const downloadCollection = document.querySelector('#downloadCollection');
    const pauseDownloading = document.querySelector('#pauseDownloading');
    const formatInput = document.querySelector('#formatInput');

    //Storage
    chrome.storage.local.get(["formatInput"], (data) => { if (data.formatInput){formatInput.value = data.formatInput} });

    formatInput.addEventListener("blur", saveToStorage);

    function saveToStorage(event) {

        const value = event.target.value;

        const id = event.target.id;

        chrome.storage.local.set({
            [id]: value
        });

    }

    //Control listeners    
    pauseDownloading.addEventListener("click", () => {

        sender({ action: 'pause' });  

    });

    deleteCollection.addEventListener("click", async () => {

        const collection = collectionFilter.value;

        if (confirm(`Are you sure you want to delete collection ${collection}?`)) {

            const result = await sender({ collection, action: 'deleteCollection' });  

            if (result) {

                location.reload();

            }  

        }

    });

    clearDB.addEventListener("click", async () => {

        if (confirm(`Are you sure you want to clear store?`)) {

            const result = await sender({ action: 'clearDB' });

            if (result) {

                location.reload();

            }  

        }

    });

    downloadCollection.addEventListener("click", () => {

        const format = formatInput.value.trim();

        if (!format) {

            alert('Enter a format type. For example, pdf.');
            return;

        }

        const obj = {

            new: ['new'],
            interrupted: ['interrupted'],
            failed: ['failed'],
            completed: ['completed'],
            start: ['start'],
            notDownloaded: ['new', 'interrupted', 'failed']

        }

        const collection = collectionFilter.value;
        const select = document.querySelector('#statusSelect').value;
        const query = obj[select];

        sender({ collection, format, query, select, action: 'download' });  

    });

    //DB onsuccess
    dbRequest.onsuccess = function (event) {

        const db = event.target.result;
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);

        const allItems = [];
        const collectionsSet = new Set();

        store.openCursor(null, 'prev').onsuccess = function (event) {

            const cursor = event.target.result;

            if (cursor) {

                const item = cursor.value;
                allItems.push(item);

                if (item.collection) {
                    collectionsSet.add(item.collection);
                }

                cursor.continue();

            } 
            else {

                const collections = Array.from(collectionsSet).sort();
                populateCollectionFilter(collections);

                if (initialCollection) {
                    collectionFilter.value = collections.includes(initialCollection) ? initialCollection : "not found";
                }

                const toShow = initialCollection
                    ? allItems.filter(item => item.collection === initialCollection)
                    : allItems;

                renderResults(toShow);

                collectionFilter.addEventListener("change", () => {

                    const selected = collectionFilter.value;

                    const filtered = selected === "all"
                        ? allItems
                        : allItems.filter(item => item.collection === selected);

                    renderResults(filtered);

                });

            }

        };

    };

    function populateCollectionFilter(collections) {

        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "all";
        collectionFilter.appendChild(allOption);

        collections.forEach(name => {

            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            collectionFilter.appendChild(option);       

        });

    }

    //rendering
    function renderResults(items) {

        //Result block
        const resultsContainer = document.getElementById("results");
        resultsContainer.innerHTML = "";

        //No items
        if (!items.length) {

            const msg = document.createElement("p");
            msg.textContent = `There are no items to display for collection ${initialCollection}`;
            resultsContainer.appendChild(msg);
            return;

        }

        //Row
        const headerRow = document.createElement("div");
        headerRow.className = "grid-row header";

        ["URL", "Title", "Collection", "Formats", "Date", "List", "Logs", "Controls"].forEach(text => {
            const cell = document.createElement("div");
            cell.className = "grid-cell";
            cell.textContent = text;
            headerRow.appendChild(cell);
        });

        resultsContainer.appendChild(headerRow);
        
        items.forEach(item => {

            const row = document.createElement("div");
            row.className = "grid-row";

            const urlCell = document.createElement("div");
            urlCell.className = "grid-cell";

            const urlLink = document.createElement("a");
            urlLink.href = item.url;
            urlLink.target = "_blank";
            urlLink.rel = "noopener noreferrer";
            urlLink.textContent = item.url;
            urlCell.appendChild(urlLink);
            row.appendChild(urlCell);

            row.appendChild(makeCell(item.title));
            row.appendChild(makeCell(item.collection));
            row.appendChild(makeCell((item.formats || []).join(", ")));
            row.appendChild(makeCell(item.date));

            // List with colored lines
            const listCell = document.createElement("div");
            listCell.className = "grid-cell";

            const listContainer = document.createElement("div");            
            listContainer.className = "list-container";
            listContainer.title = 'Use keyboard arrows to scroll slowly.';

            Object.entries(item.list || {}).forEach(([url, status], index) => {

                const line = document.createElement("div");

                line.textContent = `${url}: ${status}\n\n`;

                line.style.color = index % 2 === 1 ? "#f39c12" : "yellow" ; 

                listContainer.appendChild(line);

            });

            listCell.appendChild(listContainer);
            row.appendChild(listCell);

            const logsCell = document.createElement("div");
            logsCell.className = "grid-cell";

            const logsTextarea = document.createElement("textarea");
            logsTextarea.readOnly = true;
            logsTextarea.title = 'Use keyboard arrows to scroll slowly.';
            logsTextarea.rows = 5;
            logsTextarea.textContent = item.logs || "";
            logsCell.appendChild(logsTextarea);
            row.appendChild(logsCell);

            const controls = document.createElement("div");
            controls.className = "grid-cell item-controls";
            const formatSelect = document.createElement("select");

            (item.formats || []).forEach(format => {

                const option = document.createElement("option");
                option.value = format;
                option.textContent = format;
                formatSelect.appendChild(option);

            });
        
            const downloadBtn = document.createElement("button");
            downloadBtn.textContent = "Download";

            downloadBtn.onclick = () => {

                const format = formatSelect.value;
                const collection = item.collection;
                const url = item.url;

                sender({ action: 'downloadDB', format, collection, url });

            };

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";

            deleteBtn.onclick = async () => {

                if (confirm(`Are you sure you want to delete:\n${item.title || item.url}?`)) {

                    const url = item.url;
                    const result = await sender({ action: 'deleteOne', url });

                    if (result === true) {

                        row.remove();

                    } else {

                        console.error('Failed to delete:', result?.error);

                    }

                }

            };

            controls.appendChild(formatSelect);
            controls.appendChild(downloadBtn);
            controls.appendChild(deleteBtn);
            row.appendChild(controls);

            resultsContainer.appendChild(row);

        });

        function makeCell(content) {

            const cell = document.createElement("div");
            cell.className = "grid-cell";
            cell.textContent = content || "";

            return cell;

        }

    }

});
