const path = require('path');
const fs = require('fs');

const extend = require('lodash/extend');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');

class JspWebPackPlugin {
    constructor(options) {
        // Default options
        this.options = extend(
            {
                template: path.join(__dirname, 'index.jsp'),
                useBuildPath: true,
                filename: 'index.jsp',
                tag: 'script'
            },
            options
        );

        this.jspFile = this.getFileContent(this.options.template);
    }

    apply(compiler) {
        compiler.hooks.emit.tap('JspWebPackPlugin', compilation => {
            const { filename } = this.options;

            this.getAllChunks(compilation).forEach(chunk => {
                const chunkExtension = this.getChunkExtension(chunk);
                switch (chunkExtension) {
                    case 'js':
                        this.insertScript(chunk);
                        return;
                    case 'css':
                        this.insertStyle(chunk);
                        return;
                    default:
                        return;
                }
            });

            fs.writeFileSync(filename, this.jspFile);
        });
    }

    getFileContent(filename) {
        return fs.readFileSync(filename, 'utf8');
    }

    getAllChunks(compilation) {
        const jsonCompilation = compilation.getStats().toJson();
        return uniq(flatten(jsonCompilation.chunks.map(chunk => chunk.files))).reverse();
    }

    getChunkExtension(chunk) {
        const splittedChunk = chunk.split('.');
        return splittedChunk[splittedChunk.length - 1];
    }

    insertScript(chunk) {
        const scriptRegExp = /(<script data-type="webpack"\s*\/>)/i;
        const scriptTag = this.generateScriptTag(chunk);
        const tag = this.options.tag;
        
        if (scriptRegExp.test(this.jspFile)) {
            // Replace assets to script element
            this.jspFile = this.jspFile.replace(scriptRegExp, match => scriptTag);
        } else {
            // Append scripts to the end of the file if no <script> element exists:
            this.jspFile += scriptTag;
        }
    }

    insertStyle(chunk) {
        const linkRegExp = /(<link data-type="webpack"\s*\/>)/i;
        const styleTag = this.generateStyleTag(chunk);
        const tag = this.options.tag;
        
        if (linkRegExp.test(this.jspFile)) {
            // Replace assets to link element
            this.jspFile = this.jspFile.replace(linkRegExp, match => styleTag);
        } else {
            // Replace scripts to the end of the file if no <link> element exists:
            this.jspFile += styleTag;
        }
    }

    generateScriptTag(chunk) {
        return `<script type="text/javascript" src="${this.options.useBuildPath ? `<%= buildPath(request,"/${chunk}")%>`: chunk }" charset="utf-8"></script>`;
    }

    generateStyleTag(chunk) {
        return `<link rel="stylesheet" href="${this.options.useBuildPath ? `<%= buildPath(request,"/${chunk}")%>`: chunk }" />`;
    }
}

module.exports = JspWebPackPlugin;
