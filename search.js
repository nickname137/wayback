
function sender(obj) {    

  chrome.runtime.sendMessage(obj);
  
}


function params() {

  const baseURL = window.location.href.split('#')[0];  // ✅ correct way to get base URL

  const _hash = window.location.hash;  // e.g. "#wayback?collection=...&title=..."
  const hash = _hash.substring(1);     // remove the leading '#'

  const [_, queryString] = hash.split('?');  // split at '?', discard 'wayback'
  const queryParams = new URLSearchParams(queryString || '');

  const collection = queryParams.get('collection');
  const title = queryParams.get('title');

    console.log(title, collection)

  return {
    baseURL,
    collection,
    title
  };

}


function getLinksByFileFormats() {

  const { baseURL, title, collection } = params();

  const links = Array.from(document.querySelectorAll('.directory-listing-table a'));

  const formats = [];//new Set();
  const list = {};

  for (const link of links) {

    const href = link.getAttribute('href');
    const match = href && href.match(/\.([a-zA-Z0-9]+)$/);

    if (match) {
      
      if(formats.indexOf(match[1]) === -1){

        formats.push(match[1]); //.toLowerCase()

      }  
      
      list[baseURL + '/' + href] = 'new';

    }

  }

  return { formats, list, title, collection };

}


sender({ action: 'search', ...getLinksByFileFormats() });

