const palette={"#7c6bd6": "#4b5660", "#e79058": "#b38a30", "#5d9da4": "#456d68", "#d57697": "#847494", "#82975b": "#7a805d", "#6490cf": "#607985", "#bd865a": "#9c7852", "#9a94a8": "#8c887f", "#7c9f69": "#315d54", "#7064a7": "#71668b", "#6b9d88": "#315d54", "#ba9755": "#ad893b", "#5585ac": "#566c78", "#829a51": "#777e58", "#d18b75": "#a68148", "#5c9a95": "#54786c", "#dc9a7d": "#ad893b", "#8b89b6": "#7a7590", "#c881a6": "#967987", "#9a89ac": "#8d8090", "#a38665": "#978365", "#a87c86": "#a1766b", "#8da479": "#7a8666", "#8b7bc9": "#71668b", "#bfdca7": "#deded2"};
export const themeColor=color=>palette[String(color).toLowerCase()]||color;
// Planbalken (ab 3.2): Ausgegebenes in Neutral bis zum Plan, Überschreitung rot dahinter, Strich am Planbetrag.
// Maßstab ist der größere Wert, damit 160 % sichtbar mehr sind als 110 %.
export function planMeter(spent,planned){
  const scale=Math.max(spent,planned)||1,base=Math.min(spent,planned)/scale*100,over=Math.max(0,spent-planned)/scale*100;
  return `<span class="meter${over?' is-over':''}">${base?`<span style="width:${base.toFixed(1)}%"></span>`:''}${over?`<span class="meter-over"></span>${planned?`<i class="meter-plan" style="left:${(planned/scale*100).toFixed(1)}%"></i>`:''}`:''}</span>`;
}
