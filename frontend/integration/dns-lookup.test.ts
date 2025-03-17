import { expect, test } from '@playwright/test';

test('AWS resources are automatically loaded on page startup', async ({ page }) => {
  // Store intercepted API requests
  let interceptedApiRequest = false;
  let apiResponseData: any = null;

  // Monitor network requests
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/aws/load-resources')) {
      interceptedApiRequest = true;
    }
  });

  // Intercept API response
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/aws/load-resources') && response.status() === 200) {
      apiResponseData = await response.json();
    }
  });

  // Navigate to the home page
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  // Wait to capture the API call
  await page.waitForTimeout(5000);

  // Verify that the API request was made
  expect(interceptedApiRequest).toBe(true);

  // Validate API response
  expect(apiResponseData).toBeDefined();
  expect(apiResponseData.resources).toBeInstanceOf(Array);
  expect(apiResponseData.dependencies).toBeInstanceOf(Array);
  expect(apiResponseData.resources.length).toBeGreaterThan(0);
  expect(apiResponseData.dependencies.length).toBeGreaterThan(0);

  // Check if expected resource types exist
  const resourceTypes = apiResponseData.resources.map((r: any) => r.type);
  expect(resourceTypes).toContain('EC2');
  expect(resourceTypes).toContain('AWS');
  expect(resourceTypes).toContain('Domain');
  expect(resourceTypes).toContain('IP');

  // Check if expected dependencies exist
  const dependencyRelationships = apiResponseData.dependencies.map((d: any) => d.relationship);
  expect(dependencyRelationships).toContain('connects to');

  // Log the response for debugging
  console.log('Resources:', apiResponseData.resources.slice(0, 5)); // Show first 5 resources
  console.log('Dependencies:', apiResponseData.dependencies.slice(0, 5)); // Show first 5 dependencies
});
