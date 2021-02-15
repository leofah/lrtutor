# LR Tutor

[LR Tutor](https://www2.in.tum.de/lr-tutor) is a webtool for students, where they can create and check a canonical LR
automaton for a grammar.
It is my bachelor thesis project.
Currently, the development version is hosted [here](https://home.in.tum.de/~fahrbach).

# Installation

The tool is a static website and the creation and checking of the automaton is on the client side.
You can either clone the repository are select a released version.
In the released version lrtutor minified and already referenced in ```index.html```.
If you cloned the repo you can either minify lrtutor yourself or serve the 10 javascript files as is.
Tools like [babel](https://babeljs.io/) or [esbuild](https://esbuild.github.io/) can be used to minify the code.
For the release ```esbuild --bundle --minify lrtutor/lrtutor.js --outfile=lrtutor.min.js``` is used.
Keep in mind, the not compiled javascript contains modules and is therefore only loaded by browsers, if the file is 
served.
A local not served version will not work with javascript modules.

After downloading the release ```index.html``` can be modified to suit your website.
[HTML_doc](html_doc.md) explains the structure of the html page.
The repository version loads the unminified versions of mxGraph and lrtutor, which should be changed to the minified 
version as shown in the comments.
The mxGraph library contains around 150 files, and the minified version significantly improves the loading time of the website.

