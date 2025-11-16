const { Fish } = require('lucide-react');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

// Render the Fish icon to get the actual SVG
const fishElement = React.createElement(Fish, { size: 24 });
const svgString = ReactDOMServer.renderToString(fishElement);

console.log('Fish SVG:', svgString);

