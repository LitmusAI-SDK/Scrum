export async function apiRequest(path, options) {
  const settings = {
    method: (options && options.method) || 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (options && Object.prototype.hasOwnProperty.call(options, 'body')) {
    settings.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(path, settings);
  } catch (error) {
    throw new Error('Network request failed.');
  }

  const rawBody = await response.text();
  let parsedBody = null;
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (error) {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const message = parsedBody && parsedBody.error ? parsedBody.error : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return parsedBody;
}
