type OrnamentKind = 'floral' | 'reading' | 'updates';

function Leaf({x, y, angle = 0, scale = 1}: {x: number; y: number; angle?: number; scale?: number}) {
  return <g className="ornament-leaf" transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <path d="M0 0C-13-7-22-24-17-43C-1-39 9-20 0 0Z"/>
    <path d="M0 0C-4-13-10-27-17-43M-7-20l-8-4M-5-14l6-11" strokeWidth=".65" opacity=".6"/>
  </g>;
}

function Blossom({x, y, scale = 1}: {x: number; y: number; scale?: number}) {
  return <g className="ornament-flower" transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M0-3C-17-12-17-27-7-29C2-30 7-17 2-5C13-24 25-20 24-11C23-3 14 1 4 1C24 3 24 17 14 19C5 20 1 9 0 4C-2 25-17 26-20 15C-22 6-9 2-3 1C-24 3-30-10-21-15C-14-19-5-10 0-3Z"/>
    <path d="M-2-2l-6-9M2-2l9-8M3 2l9 8M-1 4l-7 9M-4 1l-10-3" strokeWidth=".6" opacity=".6"/>
    <circle r="3.2" fill="currentColor" stroke="none" opacity=".58"/>
    <circle cx="-5" cy="-4" r="1" fill="currentColor" stroke="none"/>
    <circle cx="5" cy="-3" r=".8" fill="currentColor" stroke="none"/>
  </g>;
}

function Star({x, y, size = 6}: {x: number; y: number; size?: number}) {
  return <g className="ornament-star" transform={`translate(${x} ${y}) scale(${size / 8})`}>
    <path d="M0-10C1-3 2-1 8 0C2 1 1 4 0 10C-1 4-2 1-8 0C-2-1-1-3 0-10Z" strokeWidth=".8"/>
    <circle r="1.1" fill="currentColor" stroke="none"/>
  </g>;
}

function Butterfly({x, y, scale = 1}: {x: number; y: number; scale?: number}) {
  return <g className="ornament-butterfly" transform={`translate(${x} ${y}) rotate(-18) scale(${scale})`}>
    <g className="ornament-wing ornament-wing-left">
      <path d="M0 0C-9-4-27-29-33-16C-40 0-22 12-3 7C-29 13-25 34-12 29C-3 26 0 12 0 0Z"/>
      <path d="M-3 5C-9 0-20-9-26-11M-4 10l-11 13" strokeWidth=".6" opacity=".6"/>
    </g>
    <g className="ornament-wing ornament-wing-right">
      <path d="M1 0C6-8 13-30 24-25C36-18 26 0 4 7C26 3 33 22 22 25C12 28 6 16 1 0Z"/>
      <path d="M5 4C13-2 19-12 23-18M6 10l15 9" strokeWidth=".6" opacity=".6"/>
    </g>
    <path d="M0-3C1 4 3 12 5 17M0-3C-7-10-6-14-4-15M1-3C4-13 8-14 10-13"/>
  </g>;
}

function GardenVine({kind}: {kind: OrnamentKind}) {
  return <svg className="scene-ornaments-vine" width="290" height="520" viewBox="0 0 290 520" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <g className="ornament-stem">
      <path d="M-14-8C27 32 15 89 58 123C96 154 68 203 91 247C116 295 72 338 96 385C114 422 102 472 132 517"/>
      <path d="M28 86C74 79 96 48 139 48C167 48 171 68 196 60M80 186C123 163 138 134 174 142M92 274C47 251 34 226 4 223M94 365C137 351 158 320 198 329M105 441C65 421 49 393 13 394"/>
      <path d="M139 48C144 28 165 25 171 10M173 142C186 119 206 127 212 105M198 329C216 306 234 317 244 296" opacity=".65"/>
    </g>
    <Leaf x={33} y={97} angle={-35} scale={.8}/>
    <Leaf x={78} y={147} angle={64} scale={.95}/>
    <Leaf x={102} y={74} angle={42} scale={.7}/>
    <Leaf x={120} y={53} angle={-26} scale={.65}/>
    <Leaf x={80} y={210} angle={-54} scale={.82}/>
    <Leaf x={133} y={162} angle={38} scale={.73}/>
    <Leaf x={58} y={250} angle={-75} scale={.7}/>
    <Leaf x={94} y={304} angle={54} scale={1.05}/>
    <Leaf x={133} y={349} angle={48} scale={.8}/>
    <Leaf x={177} y={329} angle={-23} scale={.65}/>
    <Leaf x={100} y={398} angle={-36} scale={.9}/>
    <Leaf x={68} y={421} angle={-68} scale={.68}/>
    <Leaf x={117} y={485} angle={49} scale={.85}/>
    {kind === 'floral' ? <>
      <Blossom x={194} y={61} scale={.68}/>
      <Blossom x={173} y={142} scale={.5}/>
      <Blossom x={196} y={329} scale={.6}/>
      <g className="ornament-petal" opacity=".65">
        <path d="M224 191C232 181 243 186 237 195C231 203 224 198 224 191ZM143 424C150 414 159 420 154 427C149 433 143 431 143 424Z"/>
      </g>
    </> : <g className="ornament-seeds" opacity=".7">
      <path d="M195 59C191 48 201 43 205 50C208 56 200 60 195 59ZM174 143C173 134 184 132 186 138C187 144 178 147 174 143ZM244 296C243 284 253 281 256 289C258 296 251 299 244 296Z"/>
      <path d="M159 39l-4-13M207 117l7-13M227 317l12-6"/>
    </g>}
    <path className="ornament-thread" d="M14 288C-3 303 5 324 24 314C39 307 28 292 21 300C13 310 30 335 55 331M142 74C153 92 179 82 170 71C165 64 159 72 165 77" strokeWidth=".7" opacity=".5"/>
  </svg>;
}

function Constellation({kind}: {kind: OrnamentKind}) {
  return <svg className="scene-ornaments-sky" width="420" height="280" viewBox="0 0 420 280" fill="none" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <g className="ornament-constellation">
      <path d="M59 71L130 43L173 96L249 67L306 123L374 90M173 96L184 165L249 198L306 123" opacity=".3" strokeDasharray="2 7"/>
      <Star x={59} y={71} size={5}/>
      <Star x={130} y={43} size={9}/>
      <Star x={173} y={96} size={5}/>
      <Star x={249} y={67} size={6}/>
      <Star x={306} y={123} size={9}/>
      <Star x={374} y={90} size={4}/>
      <Star x={249} y={198} size={4}/>
      <circle cx="184" cy="165" r="2" fill="currentColor" stroke="none"/>
      <circle cx="98" cy="132" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="344" cy="188" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="219" cy="26" r="1" fill="currentColor" stroke="none"/>
    </g>
    {kind === 'floral' && <>
      <path className="ornament-thread" d="M36 211C60 229 112 223 110 197C107 172 76 188 97 204C122 223 167 210 188 225" strokeDasharray="2 6" opacity=".5"/>
      <Butterfly x={204} y={219} scale={.7}/>
    </>}
    {kind === 'reading' && <g className="ornament-paper-bird" transform="translate(74 202) rotate(-12)">
      <path d="M-26 4L24-14L7 19L-2 6L-26 4ZM-2 6L24-14M-2 6l-1 12 10 1"/>
      <path className="ornament-thread" d="M-38 14C-76 17-99 4-119 18" strokeDasharray="2 6" opacity=".5"/>
    </g>}
    {kind === 'updates' && <g className="ornament-postal-orbit">
      <ellipse cx="267" cy="131" rx="116" ry="47" transform="rotate(-24 267 131)" strokeDasharray="1 7" opacity=".45"/>
      <g className="ornament-letter" transform="translate(111 190) rotate(-16)">
        <path d="M-24-15Q-28 1-23 17L26 17Q29-1 25-15Z"/>
        <path d="M-24-15L1 4L25-15M-23 17L-5 0M26 17L8 0"/>
        <circle cx="1" cy="4" r="3"/>
      </g>
      <path d="M47 182C57 177 60 183 69 178M40 193C51 188 56 194 64 189M35 204C46 199 49 205 59 200" opacity=".5"/>
    </g>}
  </svg>;
}

function HangingToken({kind}: {kind: OrnamentKind}) {
  return <svg className="scene-ornaments-token" width="240" height="330" viewBox="0 0 240 330" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path className="ornament-thread" d="M199-8C170 48 192 89 163 124C149 143 129 143 127 169" strokeWidth=".8" opacity=".65"/>
    <path className="ornament-stem" d="M248 318C208 293 211 253 177 234C148 219 122 232 93 218M211 272C182 280 169 266 152 269M176 234C187 213 171 193 183 175"/>
    <Leaf x={214} y={281} angle={-63} scale={.7}/>
    <Leaf x={196} y={255} angle={43} scale={.8}/>
    <Leaf x={152} y={227} angle={-49} scale={.6}/>
    <Leaf x={174} y={211} angle={22} scale={.58}/>
    <Leaf x={155} y={269} angle={-88} scale={.6}/>
    {kind === 'reading' ? <g className="ornament-bookmark" transform="translate(111 179) rotate(12)">
      <path d="M-37-8C-19-14-5-9 0-2C8-12 25-15 40-10L37 28C23 23 10 26 0 33C-10 24-24 23-39 28Z"/>
      <path d="M0-2V33M-39 28l-3 4C-21 26-10 29 0 37C10 29 24 27 40 32L43-7M-29 1C-21-1-13 1-7 4M-30 9C-22 7-14 9-7 12M9 4C16 0 25-1 32 1M9 12C18 8 24 8 31 9" strokeWidth=".65" opacity=".7"/>
      <path d="M14-10L13 9L19 5L24 8L25-12"/>
    </g> : kind === 'updates' ? <g className="ornament-letter" transform="translate(119 183) rotate(10)">
      <path d="M-29-20Q-33-4-29 22L32 22Q35 0 32-20Z"/>
      <path d="M-29-20L1 3L32-20M-29 22L-8-3M32 22L11-3"/>
      <path d="M-2-1C-8-8-12-1-7 4L1 11L9 4C14-1 9-8 3-1"/>
      <path d="M12-33C21-38 35-37 42-29M13-39C24-45 39-43 47-34" strokeWidth=".6" opacity=".6"/>
    </g> : <>
      <Butterfly x={123} y={179} scale={.78}/>
      <Blossom x={93} y={219} scale={.47}/>
      <path className="ornament-thread" d="M75 95C52 112 71 133 86 119C97 109 78 96 71 110" opacity=".5" strokeDasharray="2 5"/>
    </>}
    <Star x={61} y={254} size={4}/>
    <Star x={186} y={81} size={4}/>
    <circle cx="79" cy="289" r="1.2" fill="currentColor" stroke="none" opacity=".6"/>
  </svg>;
}

/** Three transparent corner illustrations; placement and motion belong to the scene stylesheet. */
export function SceneOrnaments({scene}: {scene: string}) {
  const kind: OrnamentKind = scene === 'reading' ? 'reading' : scene === 'updates' ? 'updates' : 'floral';
  return <div className={`scene-ornaments scene-ornaments-${kind}`} data-ornament-scene={kind} aria-hidden="true" style={{pointerEvents: 'none'}}>
    <GardenVine kind={kind}/>
    <Constellation kind={kind}/>
    <HangingToken kind={kind}/>
  </div>;
}
