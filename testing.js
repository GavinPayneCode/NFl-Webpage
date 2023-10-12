

// Make an API call
async function getNFLLeagueData(url, page) {
  const response = await fetch(url + 'page=' + page);
  const jsonData = await response.json();
  return jsonData;
}


// Recursively resolve all of the $ref's in the JSON data.
async function resolve_ref(ref_data) {
    
    
  for (const key in ref_data) {
    if (key === '$ref') {
      const response = await fetch(ref_data['$ref']);
      ref_data[key] = await response.json();
    } 
    else if (typeof ref_data[key] === 'object') {
      // Recursively resolve all of the $ref's in the nested object.
      await resolve_ref(ref_data[key]);
    }
  }
  // Return the JSON data with all of the $ref's resolved.
  return ref_data;
}

// Print the JSON data to the website.
async function printNFLLeagueData(url, pages) {
  let combinedJsonData = [];

  for (let i = 1; i <= pages; i++) {
    const jsonData = await getNFLLeagueData(url, i);
    const resolvedJsonData = await resolve_ref(jsonData);


    // grabs the important information
    const trimmedjson = resolvedJsonData.items;

    // Add the resolved JSON data to the combined JSON data.
    combinedJsonData = combinedJsonData.concat(trimmedjson);
  }

  // Convert the JSON array to a string.
  const combinedJsonString = JSON.stringify(combinedJsonData, null, 4);
 
  // Print the JSON string to the website.
  document.getElementById('json-output').innerHTML = combinedJsonString;
}



