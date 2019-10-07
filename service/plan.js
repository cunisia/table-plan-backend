const fs = require('fs');
const {execFile} = require('child_process');
const {ROOT} = require('../const/predicate-file');

const writeFileAndExecute = (file, fileName, filePath, callback) => {
    const maybeCreateRootPromise = fs.promises.access(ROOT)
        .then(
            function(){},
            () => fs.promises.mkdir(ROOT, { recursive: true })
        );
    maybeCreateRootPromise
        .then(() => fs.promises.writeFile(filePath, file, {
            mode: 0o755
        }))
        .then(
            () => {
                const child = execFile(`${filePath}`, (err, stdOut, stdErr) => {
                    if (err) {
                        throw new Error(`Error while executing swipl \n${file}`, err);
                    }
                    callback(stdOut);
                });
            },
            err => {
                throw new Error(`Cannot write file ${fileName}`, err);
            }
        )
};

module.exports.writeFileAndExecute = writeFileAndExecute;