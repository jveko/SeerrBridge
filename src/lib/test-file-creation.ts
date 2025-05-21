import fs from 'fs';
import path from 'path';

/**
 * This is a simple test script to verify file system access and permissions.
 * You can run it from the terminal with:
 * 
 * npx ts-node -r tsconfig-paths/register src/lib/test-file-creation.ts
 */

async function runTest() {
  console.log('Starting file creation test...');
  
  const appRoot = process.cwd();
  console.log(`Current working directory: ${appRoot}`);
  
  const testFilePath = path.join(appRoot, 'test-file-access.json');
  console.log(`Attempting to create test file at: ${testFilePath}`);
  
  try {
    // Test creating the file
    fs.writeFileSync(testFilePath, JSON.stringify({ test: true, timestamp: new Date().toISOString() }), 'utf8');
    console.log(`✅ Successfully created test file`);
    
    // Test reading the file
    const fileContents = fs.readFileSync(testFilePath, 'utf8');
    console.log(`✅ Successfully read test file: ${fileContents}`);
    
    // Test that the file exists
    console.log(`File exists: ${fs.existsSync(testFilePath)}`);
    
    // List files in the directory
    const files = fs.readdirSync(appRoot);
    console.log('Files in the root directory:');
    files.forEach(file => {
      try {
        const stats = fs.statSync(path.join(appRoot, file));
        console.log(`- ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
      } catch (err) {
        console.log(`- ${file} (error getting info)`);
      }
    });
    
    // Check for logs directory
    const logsDir = path.join(appRoot, 'logs');
    if (fs.existsSync(logsDir)) {
      console.log(`✅ Logs directory exists at: ${logsDir}`);
      
      // List log files
      const logFiles = fs.readdirSync(logsDir);
      console.log('Log files:');
      logFiles.forEach(file => console.log(`- ${file}`));
    } else {
      console.log(`❌ Logs directory does not exist at: ${logsDir}`);
    }
    
    // Test processed entries file path
    const processedEntriesPath = path.join(appRoot, 'processed_log_entries.json');
    if (fs.existsSync(processedEntriesPath)) {
      console.log(`✅ Processed entries file already exists at: ${processedEntriesPath}`);
      console.log(`Content: ${fs.readFileSync(processedEntriesPath, 'utf8')}`);
    } else {
      console.log(`❌ Processed entries file does not exist at: ${processedEntriesPath}`);
      
      // Try to create it
      try {
        fs.writeFileSync(processedEntriesPath, JSON.stringify([]), 'utf8');
        console.log(`✅ Successfully created processed entries file`);
      } catch (createError) {
        console.error(`❌ Failed to create processed entries file:`, createError);
      }
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log(`✅ Cleaned up test file`);
    
  } catch (error) {
    console.error('❌ Error during file test:', error);
  }
}

// Run the test when file is executed directly
if (require.main === module) {
  runTest()
    .then(() => console.log('Test completed'))
    .catch(err => console.error('Test failed:', err));
} 