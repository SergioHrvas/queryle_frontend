
/**
 * Calcula la posición del cursor dentro de un <textarea>, relativa a la esquina
 * superior izquierda del propio textarea (ya descontado el scroll).
 *
 * Técnica: un <div> "espejo" invisible con la misma tipografía y ancho que el textarea,
 * con el texto hasta el cursor seguido de un marcador de ancho cero.
 */
const MIRRORED_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'line-height',
  'tab-size',
  'text-indent',
  'text-transform',
  'word-spacing',
  'word-break',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
];
 
export interface CaretCoordinates {
  top: number;
  left: number;
  /** Alto de línea: sumarlo a `top` para colocar algo justo debajo del cursor. */
  height: number;
}
 
export function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number = textarea.selectionStart,
): CaretCoordinates {
  const style = getComputedStyle(textarea);
  const mirror = document.createElement('div');
 
  // Se copian longhands: los shorthands (padding, border) pueden venir vacíos según el navegador.
  for (const property of MIRRORED_PROPERTIES) {
    mirror.style.setProperty(property, style.getPropertyValue(property));
  }
 
  Object.assign(mirror.style, {
    position: 'fixed',
    top: '0',
    left: '-9999px',
    visibility: 'hidden',
    boxSizing: 'border-box',
    // clientWidth excluye borde y barra de scroll, igual que el área de texto real.
    width: `${textarea.clientWidth}px`,
    height: 'auto',
    borderWidth: '0',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  });
 
  mirror.textContent = textarea.value.substring(0, position);
 
  const marker = document.createElement('span');
  marker.textContent = '\u200b';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
 
  const lineHeight = parseFloat(style.lineHeight); // NaN si es "normal"
 
  const coordinates: CaretCoordinates = {
    top: marker.offsetTop - textarea.scrollTop + textarea.clientTop,
    left: marker.offsetLeft - textarea.scrollLeft + textarea.clientLeft,
    height: Number.isNaN(lineHeight) ? marker.offsetHeight : lineHeight,
  };
 
  mirror.remove();
 
  return coordinates;
}
 