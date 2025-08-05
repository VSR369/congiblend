// This is a mock test image buffer - in a real test environment you would use actual image files
// For testing purposes, we'll simulate image data
export const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

// Mock video buffer (MP4 header bytes)
export const testVideoBuffer = Buffer.from([
  0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
  0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
  0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
]);

// Mock audio buffer (MP3 header bytes)
export const testAudioBuffer = Buffer.from([
  0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);

export const mockImageFiles = {
  'test-image.jpg': testImageBuffer,
  'image1.jpg': testImageBuffer,
  'image2.jpg': testImageBuffer,
  'image3.jpg': testImageBuffer
};

export const mockVideoFiles = {
  'test-video.mp4': testVideoBuffer,
  'video1.mp4': testVideoBuffer,
  'video2.mp4': testVideoBuffer
};

export const mockAudioFiles = {
  'voice-note.mp3': testAudioBuffer,
  'podcast-episode.mp3': testAudioBuffer,
  'audio-file.mp3': testAudioBuffer
};

// Mock fs module for tests
export const mockFs = {
  readFileSync: (filename) => {
    const basename = filename.split('/').pop();
    return mockAudioFiles[basename] || mockVideoFiles[basename] || mockImageFiles[basename] || testImageBuffer;
  }
};