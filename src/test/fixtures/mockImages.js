// This is a mock test image buffer - in a real test environment you would use actual image files
// For testing purposes, we'll simulate image data
export const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

export const mockImageFiles = {
  'test-image.jpg': testImageBuffer,
  'image1.jpg': testImageBuffer,
  'image2.jpg': testImageBuffer,
  'image3.jpg': testImageBuffer
};

// Mock fs module for tests
export const mockFs = {
  readFileSync: (filename) => {
    const basename = filename.split('/').pop();
    return mockImageFiles[basename] || testImageBuffer;
  }
};