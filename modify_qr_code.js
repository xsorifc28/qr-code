const fs = require('fs');
const path = require('path');

const filePath = 'src/components/qr-code/qr-code.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add cornerRadius prop after existing props
const propInsertPoint = content.indexOf('@Prop() squares: boolean = false;');
if (propInsertPoint === -1) {
    console.error('Could not find insertion point for cornerRadius prop');
    process.exit(1);
}

const afterSquaresProp = content.indexOf('\n', propInsertPoint) + 1;
const beforeContent = content.substring(0, afterSquaresProp);
const afterContent = content.substring(afterSquaresProp);

content = beforeContent + '  @Prop() cornerRadius: number = 0.5;\n' + afterContent;

// Add cornerRadius to Watch decorator
const watchSquares = content.indexOf("@Watch('squares')");
if (watchSquares === -1) {
    console.error('Could not find @Watch for squares');
    process.exit(1);
}

const afterWatchSquares = content.indexOf('\n', watchSquares) + 1;
const beforeWatch = content.substring(0, afterWatchSquares);
const afterWatch = content.substring(afterWatchSquares);

content = beforeWatch + "  @Watch('cornerRadius')\n" + afterWatch;

// Replace the renderQRPositionDetectionPattern function
const functionStart = content.indexOf('function renderQRPositionDetectionPattern(');
const functionEnd = content.indexOf('function renderQRModulesSVG(');

if (functionStart === -1 || functionEnd === -1) {
    console.error('Could not find renderQRPositionDetectionPattern function');
    process.exit(1);
}

const beforeFunction = content.substring(0, functionStart);
const afterFunction = content.substring(functionEnd);

const newFunction = `function renderQRPositionDetectionPattern(
      x: number,
      y: number,
      margin: number,
      ringFill: string,
      centerFill: string,
      coordinateShift: number,
      cornerRadius: number = 0.5
    ) {
      const outerRadius = cornerRadius;
      const innerRadius = cornerRadius * 0.5;
      const centerRadius = cornerRadius * 0.5;

      if (cornerRadius === 0) {
        return \`
        <rect class="position-ring" fill="\${ringFill}" data-column="\${x - margin}" data-row="\${y - margin}" 
              x="\${x - coordinateShift - 0.5}" y="\${y - coordinateShift - 0.5}" width="7" height="7"/>
        <rect fill="white" x="\${x - coordinateShift + 0.25}" y="\${y - coordinateShift + 0.25}" width="4.5" height="4.5"/>
        <rect class="position-center" fill="\${centerFill}" data-column="\${x - margin + 2}" data-row="\${y - margin + 2}" 
              x="\${x - coordinateShift + 1.5}" y="\${y - coordinateShift + 1.5}" width="3" height="3"/>
        \`;
      } else {
        return \`
        <path class="position-ring" fill="\${ringFill}" data-column="\${x - margin}" data-row="\${y - margin}" d="M\${x - coordinateShift} \${y - 0.5 - coordinateShift}h6s\${outerRadius} 0 \${outerRadius} \${outerRadius}v6s0 \${outerRadius}-\${outerRadius} \${outerRadius}h-6s-\${outerRadius} 0-\${outerRadius}-\${outerRadius}v-6s0-\${outerRadius} \${outerRadius}-\${outerRadius}zm0.75 1s-\${innerRadius} 0-\${innerRadius} \${innerRadius}v4.5s0 \${innerRadius} \${innerRadius} \${innerRadius}h4.5s\${innerRadius} 0 \${innerRadius}-\${innerRadius}v-4.5s0-\${innerRadius}-\${innerRadius}-\${innerRadius}h-4.5z"/>
        <path class="position-center" fill="\${centerFill}" data-column="\${x - margin + 2}" data-row="\${y - margin + 2}" d="M\${x + 2 - coordinateShift} \${y + 1.5 - coordinateShift}h2s\${centerRadius} 0 \${centerRadius} \${centerRadius}v2s0 \${centerRadius}-\${centerRadius} \${centerRadius}h-2s-\${centerRadius} 0-\${centerRadius}-\${centerRadius}v-2s0-\${centerRadius} \${centerRadius}-\${centerRadius}z"/>
        \`;
      }
    }

    `;

content = beforeFunction + newFunction + afterFunction;

// Update renderQRPositionDetectionPatterns function calls to include cornerRadius
content = content.replace(
    /renderQRPositionDetectionPattern\(\s*margin,\s*margin,\s*margin,\s*ringFill,\s*centerFill,\s*coordinateShift\s*\)/g,
    'renderQRPositionDetectionPattern(margin, margin, margin, ringFill, centerFill, coordinateShift, cornerRadius)'
);

content = content.replace(
    /renderQRPositionDetectionPattern\(\s*count - 7 \+ margin,\s*margin,\s*margin,\s*ringFill,\s*centerFill,\s*coordinateShift\s*\)/g,
    'renderQRPositionDetectionPattern(count - 7 + margin, margin, margin, ringFill, centerFill, coordinateShift, cornerRadius)'
);

content = content.replace(
    /renderQRPositionDetectionPattern\(\s*margin,\s*count - 7 \+ margin,\s*margin,\s*ringFill,\s*centerFill,\s*coordinateShift\s*\)/g,
    'renderQRPositionDetectionPattern(margin, count - 7 + margin, margin, ringFill, centerFill, coordinateShift, cornerRadius)'
);

// Update the renderQRPositionDetectionPatterns function signature
content = content.replace(
    /function renderQRPositionDetectionPatterns\(\s*count: number,\s*margin: number,\s*ringFill: string,\s*centerFill: string,\s*coordinateShift: number\s*\)/,
    'function renderQRPositionDetectionPatterns(count: number, margin: number, ringFill: string, centerFill: string, coordinateShift: number, cornerRadius: number)'
);

// Update the call to renderQRPositionDetectionPatterns
content = content.replace(
    /renderQRPositionDetectionPatterns\(\s*this\.moduleCount,\s*margin,\s*this\.positionRingColor,\s*this\.positionCenterColor,\s*coordinateShift\s*\)/,
    'renderQRPositionDetectionPatterns(this.moduleCount, margin, this.positionRingColor, this.positionCenterColor, coordinateShift, this.cornerRadius)'
);

fs.writeFileSync(filePath, content);
console.log('Successfully modified qr-code.tsx');
