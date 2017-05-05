var fs = require('fs');
var path = require('path');
var ffmpeg = require('fluent-ffmpeg');
var FileReader = require('filereader');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var FileAPI = require('file-api')
  , File = FileAPI.File
  , FileList = FileAPI.FileList
  , FileReader = FileAPI.FileReader
  ;
var fileUtils = require('../../utils/FileUtils.js');


var BaseParseClass = require('./BaseParseClass');

class BaseResourceClass extends BaseParseClass.BaseParseClass {

    // To be implemented by the implementing class
    stitch() {}

}

var stitchSlide = (slide, outputFileName) => {
    return new Promise((fulfill, reject) => {
        console.log('stitchSlide : called');
        console.log(slide);
        var childrenResources = slide.get('children_resources');
        console.log(childrenResources);
        childrenResources.fetch().then(
            () => {
                var childResource = childrenResources.get('elements')[0];
                childResource.fetch().then(
                    () => {
                        console.log(childResource);
                        if(childResource.className === 'Image') {
                            // stitch image
                            var c = childResource.get('children_resources');
                            c.fetch().then(
                                () => {
                                    var e = c.get('elements');
                                    if(e) {
                                        // elements is not falsey
                                        var audioResource = e[0];
                                        audioResource.fetch().then(
                                            () => {
                                                var audioFile = audioResource.get('file');
                                                var imageFile = childResource.get('file');
                                                console.log(audioFile);
                                                console.log(imageFile);

                                                // stitch
                                                ffmpeg()
                                                    .input(audioFile.url())
                                                    .input(imageFile.url())
                                                    .videoCodec('libx264')
                                                    .fps(29.7)
                                                    .format('mp4')
                                                    // .size('200x200')
                                                    .outputOptions([
                                                        '-c:v libx264',
                                                        '-preset slow',
                                                        '-crf 22',
                                                        '-c:a aac',
                                                        '-strict experimental',
                                                        '-pix_fmt yuv420p',
                                                        '-b:a 192k'
                                                    ])
                                                    .on('stderr', function(stderrLine) {
                                                        console.log('Stderr output: ' + stderrLine);
                                                    })
                                                    .on('end', function(stdout, stderr) {
                                                        console.log('Transcoding succeeded !');
                                                        fulfill(outputFileName);
                                                    })
                                                    .save(outputFileName);
                                            }
                                        );
                                    } else {
                                        // no audio, so do nothing
                                        fulfill();
                                    }
                                }
                            );
                        } else if(childResource.className == 'Video') {
                            // stitch video
                            var file = childResource.get('file');
                            Parse.Cloud.httpRequest({ url: file.url() }).then(function(response) {
                                // The file contents are in response.buffer.
                                console.log('httpRequest : response');
                                var extension = path.extname(file.url())
                                console.log(extension);
                                var newFileName = fileUtils.getNewUniqueFileName(extension);
                                try {
                                    fs.writeFile(newFileName, response.buffer, 'binary', (error) => {
                                        if(error) {
                                            console.log(error);
                                            reject(error);
                                        }
                                        console.log('fulfilling');
                                        fulfill(newFileName);
                                    });
                                } catch (e) {
                                    console.log(e);
                                    throw e;
                                }

                            });
                        } else if(childResource.className == 'Question') {
                            // stitch question
                            fulfill();
                        }
                    }
                );
            },
            (error) => {
                console.log(error);
            }
        );
    });
}

module.exports = {
    BaseResourceClass,
    stitchSlide
}
