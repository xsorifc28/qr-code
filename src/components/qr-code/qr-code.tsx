import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  Method,
  State,
  Watch,
} from '@stencil/core';

import { addPlugin, animate } from 'just-animate';
import { waapiPlugin } from 'just-animate/lib.es2015/web';
addPlugin(waapiPlugin);

// Comment below and line 149 build for production:
import { player } from 'just-animate/lib.es2015/tools';

import qrcode from 'qrcode-generator';
import {
  getAnimationPreset,
  QRCodeAnimation,
  QRCodeEntity,
  AnimationPreset,
} from './animations';

@Component({
  tag: 'qr-code',
  styleUrl: 'qr-code.css',
  shadow: true,
})
export class BpQRCode {
  @Element() qrCodeElement: HTMLElement;

  @Prop() contents = '';
  @Prop() protocol: string = '';
  @Prop() moduleColor: string = '#000';
  @Prop() positionRingColor: string = '#000';
  @Prop() positionCenterColor: string = '#000';
  @Prop() maskXToYRatio: number = 1;
  @Prop() squares: boolean = false;
  @Prop() moduleRoundness: number = 0.5;
  @Prop() positionRingRoundness: number = 0.5;
  @Prop() positionCenterRoundness: number = 0.5;

  @State() data: string;
  @State() moduleCount: number;

  @Event() codeRendered: EventEmitter;

  /**
   * The first update must run after load to query the created shadowRoot for
   * slotted nodes.
   */
  componentDidLoad() {
    this.updateQR();
  }

  componentDidUpdate() {
    this.codeRendered.emit();
  }

  @Watch('contents')
  @Watch('protocol')
  @Watch('moduleColor')
  @Watch('positionRingColor')
  @Watch('positionCenterColor')
  @Watch('maskXToYRatio')
  @Watch('squares')
  updateQR() {
    /**
     * E.g. Firefox, as of Firefox 61
     */
    const isUsingWebComponentPolyfill =
      (this.qrCodeElement as any) === this.qrCodeElement.shadowRoot;
    const realSlot = this.qrCodeElement.shadowRoot.querySelector('slot');
    const hasSlot = isUsingWebComponentPolyfill
      ? this.qrCodeElement.querySelector('[slot]')
        ? true
        : false
      : realSlot
      ? realSlot.assignedNodes().length > 0
      : false;

    this.data = this.generateQRCodeSVG(this.contents, hasSlot);
  }

  @Method()
  animateQRCode(animation?: AnimationPreset | QRCodeAnimation) {
    this.executeAnimation(
      typeof animation === 'string' ? getAnimationPreset(animation) : animation
    );
  }

  @Method()
  getModuleCount() {
    return this.moduleCount;
  }

  executeAnimation(animation: QRCodeAnimation) {
    const modules = Array.from(
      this.qrCodeElement.shadowRoot.querySelectorAll('.module')
    );
    const rings = Array.from(
      this.qrCodeElement.shadowRoot.querySelectorAll('.position-ring')
    );
    const centers = Array.from(
      this.qrCodeElement.shadowRoot.querySelectorAll('.position-center')
    );
    const icons = Array.from(
      this.qrCodeElement.shadowRoot.querySelectorAll('#icon-wrapper')
    );
    const setEntityType = (array: Element[], entity: QRCodeEntity) => {
      return array.map((element) => {
        return {
          element,
          entityType: entity,
        };
      });
    };

    const animationAdditions = [
      ...setEntityType(modules, QRCodeEntity.Module),
      ...setEntityType(rings, QRCodeEntity.PositionRing),
      ...setEntityType(centers, QRCodeEntity.PositionCenter),
      ...setEntityType(icons, QRCodeEntity.Icon),
    ]
      .map(({ element, entityType }) => {
        return {
          element,
          // SVGElement.dataset is part of the SVG 2.0 draft
          // TODO: requires a polyfill for Edge:
          // https://developer.mozilla.org/en-US/docs/Web/API/SVGElement/dataset
          positionX: parseInt((element as any).dataset.column, 10),
          positionY: parseInt((element as any).dataset.row, 10),
          entityType: entityType,
        };
      })
      .map((entityInfo) =>
        animation(
          entityInfo.element,
          entityInfo.positionX,
          entityInfo.positionY,
          this.moduleCount,
          entityInfo.entityType
        )
      );

    const timeline = animate(animationAdditions);

    // Comment out below to build for production:
    player(timeline);

    timeline.play();
  }

  generateQRCodeSVG(contents: string, maskCenter: boolean) {
    const qr = qrcode(
      /* Auto-detect QR Code version to use */ 0,
      /* Highest error correction level */ 'H'
    );
    qr.addData(contents);
    qr.make();
    const margin = 4;
    this.moduleCount = qr.getModuleCount();
    const pixelSize = this.moduleCount + margin * 2;
    const coordinateShift = pixelSize / 2;
    return `
    <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="${0 - coordinateShift} ${
      0 - coordinateShift
    } ${pixelSize} ${pixelSize}"
        preserveAspectRatio="xMinYMin meet">
    <rect
        width="100%"
        height="100%"
        fill="white"
        fill-opacity="0"
        cx="${-coordinateShift}"
        cy="${-coordinateShift}"/>
    ${
      this.squares
        ? void 0
        : renderQRPositionDetectionPatterns(
            this.moduleCount,
            margin,
            this.positionRingColor,
            this.positionCenterColor,
            coordinateShift, 
            this.positionRingRoundness,
            this.positionCenterRoundness
        )
    }
    ${renderQRModulesSVG(
      qr,
      this.moduleCount,
      margin,
      maskCenter,
      this.maskXToYRatio,
      this.squares,
      this.moduleColor,
      coordinateShift,
      this.moduleRoundness
    )}
    </svg>`;

    function renderQRPositionDetectionPatterns(
      count: number,
      margin: number,
      ringFill: string,
      centerFill: string,
      coordinateShift: number,
      positionRingRoundness: number,
      positionCenterRoundness: number
    ) {
      return `
      ${renderQRPositionDetectionPattern(
        margin,
        margin,
        margin,
        ringFill,
        centerFill,
        coordinateShift,
        positionRingRoundness,
        positionCenterRoundness
      )}
      ${renderQRPositionDetectionPattern(
        count - 7 + margin,
        margin,
        margin,
        ringFill,
        centerFill,
        coordinateShift,
        positionRingRoundness,
        positionCenterRoundness
      )}
      ${renderQRPositionDetectionPattern(
        margin,
        count - 7 + margin,
        margin,
        ringFill,
        centerFill,
        coordinateShift,
        positionRingRoundness,
        positionCenterRoundness
      )}
      `;
    }

      function renderQRPositionDetectionPattern(
          x: number,
          y: number,
          margin: number,
          ringFill: string,
          centerFill: string,
          coordinateShift: number,
          positionRingRoundness: number = 0,
          positionCenterRoundness: number = 0
      ) {
          // Clamp roundness values between 0 (square) and 1 (circle)
          positionRingRoundness = Math.max(0, Math.min(1, positionRingRoundness));
          positionCenterRoundness = Math.max(0, Math.min(1, positionCenterRoundness));

          // Outer ring (7x7)
          const outerSide = 7;
          const outerCornerRadius = positionRingRoundness * (outerSide / 2);
          const outerStraight = outerSide - 2 * outerCornerRadius;
          const outerPath = `
    M${x - coordinateShift + outerCornerRadius - 0.5} ${y - 0.5 - coordinateShift}
    h${outerStraight}
    ${outerCornerRadius > 0 ? `a${outerCornerRadius},${outerCornerRadius} 0 0 1 ${outerCornerRadius},${outerCornerRadius}` : ''}
    v${outerStraight}
    ${outerCornerRadius > 0 ? `a${outerCornerRadius},${outerCornerRadius} 0 0 1 -${outerCornerRadius},${outerCornerRadius}` : ''}
    h-${outerStraight}
    ${outerCornerRadius > 0 ? `a${outerCornerRadius},${outerCornerRadius} 0 0 1 -${outerCornerRadius},-${outerCornerRadius}` : ''}
    v-${outerStraight}
    ${outerCornerRadius > 0 ? `a${outerCornerRadius},${outerCornerRadius} 0 0 1 ${outerCornerRadius},-${outerCornerRadius}` : ''}
    z
  `;

          // Inner ring hole (5x5)
          const innerSide = 5;
          const innerCornerRadius = positionRingRoundness * (innerSide / 2);
          const innerStraight = innerSide - 2 * innerCornerRadius;
          const innerOffset = 1;
          const innerPath = `
    M${x - coordinateShift + innerOffset + innerCornerRadius - 0.5} ${y - 0.5 - coordinateShift + innerOffset}
    h${innerStraight}
    ${innerCornerRadius > 0 ? `a${innerCornerRadius},${innerCornerRadius} 0 0 1 ${innerCornerRadius},${innerCornerRadius}` : ''}
    v${innerStraight}
    ${innerCornerRadius > 0 ? `a${innerCornerRadius},${innerCornerRadius} 0 0 1 -${innerCornerRadius},${innerCornerRadius}` : ''}
    h-${innerStraight}
    ${innerCornerRadius > 0 ? `a${innerCornerRadius},${innerCornerRadius} 0 0 1 -${innerCornerRadius},-${innerCornerRadius}` : ''}
    v-${innerStraight}
    ${innerCornerRadius > 0 ? `a${innerCornerRadius},${innerCornerRadius} 0 0 1 ${innerCornerRadius},-${innerCornerRadius}` : ''}
    z
  `;

          // Center (3x3)
          const centerSide = 3;
          const centerCornerRadius = positionCenterRoundness * (centerSide / 2);
          const centerStraight = centerSide - 2 * centerCornerRadius;
          const centerOffset = 2;
          const centerPath = `
    M${x - coordinateShift + centerOffset + centerCornerRadius - 0.5} ${y - 0.5 - coordinateShift + centerOffset}
    h${centerStraight}
    ${centerCornerRadius > 0 ? `a${centerCornerRadius},${centerCornerRadius} 0 0 1 ${centerCornerRadius},${centerCornerRadius}` : ''}
    v${centerStraight}
    ${centerCornerRadius > 0 ? `a${centerCornerRadius},${centerCornerRadius} 0 0 1 -${centerCornerRadius},${centerCornerRadius}` : ''}
    h-${centerStraight}
    ${centerCornerRadius > 0 ? `a${centerCornerRadius},${centerCornerRadius} 0 0 1 -${centerCornerRadius},-${centerCornerRadius}` : ''}
    v-${centerStraight}
    ${centerCornerRadius > 0 ? `a${centerCornerRadius},${centerCornerRadius} 0 0 1 ${centerCornerRadius},-${centerCornerRadius}` : ''}
    z
  `;

          return `
    <path class="position-ring" fill="${ringFill}" fill-rule="evenodd" data-column="${x - margin}" data-row="${y - margin}" d="${outerPath.trim() + innerPath.trim()}"/>
    <path class="position-center" fill="${centerFill}" data-column="${x - margin + 2}" data-row="${y - margin + 2}" d="${centerPath.trim()}"/>
  `;
      }

      function renderQRModulesSVG(
          qr: QRCode,
          count: number,
          margin: number,
          maskCenter: boolean,
          maskXToYRatio: number,
          squares: boolean,
          moduleFill: string,
          coordinateShift: number,
          moduleRoundness: number = 1
      ) {
          let svg = '';
          for (let column = 0; column < count; column += 1) {
              const positionX = column + margin;
              for (let row = 0; row < count; row += 1) {
                  if (
                      qr.isDark(column, row) &&
                      (squares ||
                          (!isPositioningElement(row, column, count) &&
                              !isRemovableCenter(
                                  row,
                                  column,
                                  count,
                                  maskCenter,
                                  maskXToYRatio
                              )))
                  ) {
                      const positionY = row + margin;

                      if (squares) {
                          // Keep existing square logic unchanged
                          svg += `
            <rect x="${positionX - 0.5 - coordinateShift}" y="${
                              positionY - 0.5 - coordinateShift
                          }" width="1" height="1" />
          `;
                      } else {
                          // New rounded rectangle logic
                          if (moduleRoundness === 1) {
                              // Full circle (moduleRoundness = 1)
                              svg += `
            <circle
                class="module"
                fill="${moduleFill}"
                cx="${positionX - coordinateShift}"
                cy="${positionY - coordinateShift}"
                data-column="${column}"
                data-row="${row}"
                r="0.5"/>`;
                          } else {
                              // Rounded rectangle (moduleRoundness 0-0.99)
                              const radius = moduleRoundness * 0.5; // Scale roundness to module size
                              svg += `
            <rect
                class="module"
                fill="${moduleFill}"
                x="${positionX - 0.5 - coordinateShift}"
                y="${positionY - 0.5 - coordinateShift}"
                width="1"
                height="1"
                rx="${radius}"
                ry="${radius}"
                data-column="${column}"
                data-row="${row}"/>`;
                          }
                      }
                  }
              }
          }
          return svg;
      }

    function isPositioningElement(row: number, column: number, count: number) {
      const elemWidth = 7;
      return row <= elemWidth
        ? column <= elemWidth || column >= count - elemWidth
        : column <= elemWidth
        ? row >= count - elemWidth
        : false;
    }

    /**
     * For ErrorCorrectionLevel 'H', up to 30% of the code can be corrected. To
     * be safe, we limit damage to 10%.
     */
    function isRemovableCenter(
      row: number,
      column: number,
      count: number,
      maskCenter: boolean,
      maskXToYRatio: number
    ) {
      if (!maskCenter) return false;
      const center = count / 2;
      const safelyRemovableHalf = Math.floor((count * Math.sqrt(0.1)) / 2);
      const safelyRemovableHalfX = safelyRemovableHalf * maskXToYRatio;
      const safelyRemovableHalfY = safelyRemovableHalf / maskXToYRatio;
      const safelyRemovableStartX = center - safelyRemovableHalfX;
      const safelyRemovableEndX = center + safelyRemovableHalfX;
      const safelyRemovableStartY = center - safelyRemovableHalfY;
      const safelyRemovableEndY = center + safelyRemovableHalfY;

      return (
        row >= safelyRemovableStartY &&
        row <= safelyRemovableEndY &&
        column >= safelyRemovableStartX &&
        column <= safelyRemovableEndX
      );
    }
  }

  render() {
    return (
      <div id="qr-container">
        <div
          id="icon-container"
          style={this.squares ? { display: 'none', visibility: 'hidden' } : {}}
        >
          <div
            id="icon-wrapper"
            style={{ width: `${18 * this.maskXToYRatio}%` }}
            data-column={this.moduleCount / 2}
            data-row={this.moduleCount / 2}
          >
            <slot name="icon" />
          </div>
        </div>
        <div innerHTML={this.data} />
      </div>
    );
  }
}
