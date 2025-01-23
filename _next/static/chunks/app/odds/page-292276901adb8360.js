(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[333],{9180:(e,t,r)=>{Promise.resolve().then(r.bind(r,8196)),Promise.resolve().then(r.bind(r,8121)),Promise.resolve().then(r.bind(r,9026)),Promise.resolve().then(r.bind(r,8155)),Promise.resolve().then(r.bind(r,8810)),Promise.resolve().then(r.bind(r,8506)),Promise.resolve().then(r.bind(r,1805)),Promise.resolve().then(r.bind(r,5366)),Promise.resolve().then(r.bind(r,5399)),Promise.resolve().then(r.t.bind(r,8173,23)),Promise.resolve().then(r.t.bind(r,7970,23)),Promise.resolve().then(r.bind(r,4798))},8196:(e,t,r)=>{"use strict";r.d(t,{OddsCalculator:()=>h});var n=r(5155),l=r(2115),i=r(4798);r(1491);var a=r(3950),s=r(3098),o=r(5257),c=r(8683),d=r(6662);let h=()=>{let[e,t]=(0,l.useState)(6),r=(e,t)=>Math.round(100*(0,d.gP)((0,d.Sw)(90,e),(0,d.Sw)(6,t)*(0,d.Sw)(84,e-t)))/100;return(0,n.jsx)("section",{className:"odds",children:(0,n.jsxs)(i.default,{children:[(0,n.jsx)(o._,{title:"Odds Calculator"}),(0,n.jsxs)("div",{className:"probability",children:[(0,n.jsx)("div",{className:"probability__header",children:(0,n.jsx)("div",{className:"probability__top",children:(0,n.jsxs)("div",{className:"probability__top-shape",children:[(0,n.jsx)("div",{className:"probability__top-title",children:"Probability of winning by playing"}),(0,n.jsx)(s.m,{variant:"secondary",text:""+e,onSelect:e=>t(parseInt(e||"",10)),children:(0,d.y1)(15).map((t,r)=>(0,n.jsx)(s.m.Item,{text:""+(r+6),active:r+6===e,eventKey:r+6},r))}),(0,n.jsx)("div",{className:"probability__top-title",children:"numbers"})]})})}),(0,n.jsx)("div",{className:"probability__table",children:(0,n.jsxs)(c.A,{children:[(0,n.jsx)(c.A.Header,{children:(0,n.jsxs)(c.A.Row,{children:[(0,n.jsx)(c.A.Cell,{children:"Matches"}),(0,n.jsx)(c.A.Cell,{children:"Probability"}),(0,n.jsx)(c.A.Cell,{children:"Calculation"})]})}),(0,n.jsxs)(c.A.Body,{children:[[6,5,4,3,2].map(t=>(0,n.jsxs)(c.A.Row,{children:[(0,n.jsx)(c.A.Cell,{children:t}),(0,n.jsxs)(c.A.Cell,{className:"main-table__text--blue",children:["1 : ",r(e,t)]}),(0,n.jsx)(c.A.Cell,{children:(0,n.jsx)(a.InlineMath,{math:"\n                        \\frac{\n                          {6 \\choose ".concat(t,"}\n                          \\cdot\n                          {{90 - 6} \\choose {").concat(e," - ").concat(t,"}}\n                        }{90 \\choose ").concat(e,"} = \\frac{\n                          ").concat((0,d.Sw)(e,t),"\n                          \\cdot\n                          ").concat((0,d.Sw)(84,e-t),"\n                        }{").concat((0,d.Sw)(90,e),"}\n                      ")})})]},t)),(0,n.jsxs)(c.A.Row,{children:[(0,n.jsx)(c.A.Cell,{children:"2+"}),(0,n.jsxs)(c.A.Cell,{className:"main-table__text--blue",children:["1 : ",Math.round(100*(1/[6,5,4,3,2].map(t=>1/r(e,t)).reduce((e,t)=>e+t,0)))/100]}),(0,n.jsx)(c.A.Cell,{children:(0,n.jsx)(a.InlineMath,{math:"\n                      \\sum_{i = 2}^{6}{\n                        \\frac{\n                          {6 \\choose i}\n                          \\cdot\n                          {{90 - 6} \\choose {".concat(e," - i}}\n                        }{90 \\choose ").concat(e,"}\n                      }\n                    ")})})]})]})]})}),(0,n.jsxs)("div",{className:"probability__descr",children:["The probability of matching ",(0,n.jsx)("em",{children:"i"})," of the 6 drawn numbers by playing a ",(0,n.jsx)("em",{children:"k"}),"-number ticket is calculated with the following formula:"]}),(0,n.jsx)("div",{className:"probability__expression",children:(0,n.jsx)(a.BlockMath,{math:"\n              \\frac{\n                {6 \\choose i} \\cdot {{90 - 6} \\choose {k - i}}\n              }{\n                {90 \\choose k}\n              }\n            "})}),(0,n.jsxs)("div",{className:"probability__descr",children:["That is the probability of matching ",(0,n.jsx)("em",{children:"exactly i"})," of the drawn numbers. For the probability of winning at least 1 prize (that is, matching ",(0,n.jsx)("em",{children:"at least 2"})," of the drawn numbers, as per last row of the table) we need to add up all the above probabilities."]})]})]})})}},3950:function(e,t,r){var n,l,i;i=function(e,t,r,n){"use strict";function l(e){return e&&e.__esModule?e:{default:e}}function i(e){if("function"!=typeof WeakMap)return null;var t=new WeakMap,r=new WeakMap;return(i=function(e){return e?r:t})(e)}Object.defineProperty(e,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(e,{BlockMath:()=>d,InlineMath:()=>h}),t=function(e,t){if(e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var r=i(void 0);if(r&&r.has(e))return r.get(e);var n={},l=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var a in e)if("default"!==a&&Object.prototype.hasOwnProperty.call(e,a)){var s=l?Object.getOwnPropertyDescriptor(e,a):null;s&&(s.get||s.set)?Object.defineProperty(n,a,s):n[a]=e[a]}return n.default=e,r&&r.set(e,n),n}(t),r=l(r),n=l(n);let a=(e,{displayMode:l})=>{let i=({children:r,errorColor:i,math:a,renderError:s})=>{let o=null!=a?a:r,{html:c,error:d}=(0,t.useMemo)(()=>{try{return{html:n.default.renderToString(o,{displayMode:l,errorColor:i,throwOnError:!!s}),error:void 0}}catch(e){if(e instanceof n.default.ParseError||e instanceof TypeError)return{error:e};throw e}},[o,i,s]);return d?s?s(d):t.default.createElement(e,{html:`${d.message}`}):t.default.createElement(e,{html:c})};return i.propTypes={children:r.default.string,errorColor:r.default.string,math:r.default.string,renderError:r.default.func},i},s={html:r.default.string.isRequired},o=({html:e})=>t.default.createElement("div",{"data-testid":"react-katex",dangerouslySetInnerHTML:{__html:e}});o.propTypes=s;let c=({html:e})=>t.default.createElement("span",{"data-testid":"react-katex",dangerouslySetInnerHTML:{__html:e}});c.propTypes=s;let d=a(o,{displayMode:!0}),h=a(c,{displayMode:!1})},"object"==typeof e.exports?i(t,r(2115),r(1996),r(2310)):(n=[t,r(2115),r(1996),r(2310)],void 0===(l=i.apply(t,n))||(e.exports=l))},1491:()=>{}},e=>{var t=t=>e(e.s=t);e.O(0,[562,913,586,506,202,774,441,517,358],()=>t(9180)),_N_E=e.O()}]);