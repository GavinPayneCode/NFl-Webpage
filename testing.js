

  const client = new MongoClient('localhost', 27017);
  const db = client.db('my_database');
  const manual_references_collection = db.collection('manual_references');

async function get_data_from_ref(ref_url) {
  // Check if the `$ref` is in the MongoDB Manual References collection.

  const manual_reference = await manual_references_collection.findOne({ '$ref': ref_url });

  // If the `$ref` is not in the MongoDB Manual References collection, make an API call to the `$ref` and store the results in the MongoDB Manual References collection.
  if (!manual_reference) {
    const response = await fetch(ref_url);
    const ref_data = await response.json();

    await manual_references_collection.insertOne({ '$ref': ref_url, 'data': ref_data });

    manual_reference = await manual_references_collection.findOne({ '$ref': ref_url });
  }

  // Return the data from the MongoDB Manual References collection.
  return manual_reference['data'];
}

async function get_all_ref_data(api_url) {
  // Get the JSON data from the API.
  const response = await fetch(api_url);
  const json_data = await response.json();

  // Recursively resolve all of the $ref's in the JSON data.
  async function resolve_ref(ref_data) {
    for (const key in ref_data) {
      if (key === '$ref') {
        // Get the data for the referenced document.
        const referenced_data = await get_data_from_ref(ref_data['$ref']);

        // Replace the $ref with the referenced data.
        ref_data[key] = referenced_data;
      } else if (typeof ref_data[key] === 'object') {
        // Recursively resolve all of the $ref's in the nested object.
        await resolve_ref(ref_data[key]);
      }
    }
  }

  // Resolve all of the $ref's in the JSON data.
  await resolve_ref(json_data);

  // Return the JSON data with all of the $ref's resolved.
  return json_data;
}
