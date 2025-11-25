import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';

// Set FFmpeg path from ffmpeg-static
ffmpeg.setFfmpegPath(ffmpegPath);
console.log('Using FFmpeg at:', ffmpegPath);

async function mergeVideos(video1Name, video2Name) {
    try {
        const video1Path = path.join('./outputVideos', video1Name);
        const video2Path = path.join('./outputVideos', video2Name);
        
        // Check if both videos exist
        if (!fs.existsSync(video1Path)) {
            console.error(`Video 1 not found: ${video1Path}`);
            return;
        }
        
        if (!fs.existsSync(video2Path)) {
            console.error(`Video 2 not found: ${video2Path}`);
            return;
        }
        
        console.log('Found both videos:');
        console.log('Video 1:', video1Path);
        console.log('Video 2:', video2Path);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const mergedFilename = `merged_360_${timestamp}.mp4`;
        const mergedPath = path.join('./outputVideos', mergedFilename);
        
        // Create a text file with the list of videos to concatenate
        const fileListPath = path.join('./outputVideos', `filelist_${timestamp}.txt`);
        const fileListContent = `file '${path.basename(video1Path)}'\nfile '${path.basename(video2Path)}'`;
        fs.writeFileSync(fileListPath, fileListContent);
        
        console.log('\nFile list created:', fileListPath);
        console.log('Content:\n', fileListContent);
        console.log('\nMerging videos...');
        
        // Use FFmpeg to concatenate videos
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(fileListPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy'])
                .output(mergedPath)
                .on('start', (commandLine) => {
                    console.log('FFmpeg command:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log('Processing: ' + progress.percent + '% done');
                })
                .on('end', () => {
                    console.log('\n✓ Videos merged successfully!');
                    console.log('Output file:', mergedPath);
                    
                    // Clean up file list
                    fs.unlinkSync(fileListPath);
                    console.log('Cleaned up temporary file list');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('\n✗ FFmpeg error:', err.message);
                    reject(err);
                })
                .run();
        });
        
    } catch (error) {
        console.error('Merge error:', error);
    }
}

// Get video names from command line arguments or use defaults
const video1 = process.argv[2] || 'video1.mp4';
const video2 = process.argv[3] || 'video2.mp4';

console.log('=== Video Merge Test ===');
console.log('Usage: node videoMerge.js <video1.mp4> <video2.mp4>');
console.log('========================\n');

mergeVideos(video1, video2);
