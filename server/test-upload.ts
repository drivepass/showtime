import { navoriLogin, navoriUploadFile } from './navori.js';

async function test() {
  // Login to get token
  const loginResult = await navoriLogin(
    process.env.NAVORI_USERNAME || 'sajid@systemrapid.com',
    process.env.NAVORI_PASSWORD || 'Sajid@1234'
  );

  if (!loginResult.success || !loginResult.token) {
    console.log('Login failed:', loginResult.error);
    return;
  }

  console.log('Login successful, token:', loginResult.token.substring(0, 10) + '...');

  // Create a 1x1 red PNG (smallest valid image, 70 bytes)
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
  );

  // Build multipart/form-data body (matching browser FormData format)
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="test-upload.png"\r\n` +
      `Content-Type: image/png\r\n\r\n`
    ),
    pngBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const contentType = `multipart/form-data; boundary=${boundary}`;

  console.log('Multipart body size:', multipartBody.length, 'bytes');
  console.log('Content-Type:', contentType);

  // Test via navoriUploadFile function
  console.log('\n=== Testing navoriUploadFile() ===');
  const uploadResult = await navoriUploadFile(loginResult.token, multipartBody, contentType);
  console.log('Function returned:', JSON.stringify(uploadResult, null, 2));

  // NOTE: The function reports success:true because it checks response.ok (HTTP 200),
  // but Navori returns Status:"INTERNAL_SERVER_ERROR" in the body.
  // This is a bug in navoriUploadFile — it should check data.Status !== "INTERNAL_SERVER_ERROR".
  if (uploadResult.media?.Status === 'INTERNAL_SERVER_ERROR') {
    console.log('\n⚠ WARNING: navoriUploadFile reports success but Navori returned INTERNAL_SERVER_ERROR');
    console.log('  The function checks response.ok (HTTP 200) but Navori uses body Status field for errors.');
  }
}

test().catch(console.error);
