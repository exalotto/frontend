(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[284],{2002:(e,n,t)=>{Promise.resolve().then(t.bind(t,4005)),Promise.resolve().then(t.bind(t,8121)),Promise.resolve().then(t.bind(t,9026)),Promise.resolve().then(t.bind(t,8155)),Promise.resolve().then(t.bind(t,8810)),Promise.resolve().then(t.bind(t,8506)),Promise.resolve().then(t.bind(t,1805)),Promise.resolve().then(t.bind(t,5366)),Promise.resolve().then(t.bind(t,5399)),Promise.resolve().then(t.t.bind(t,1491,23)),Promise.resolve().then(t.t.bind(t,8173,23)),Promise.resolve().then(t.t.bind(t,7970,23)),Promise.resolve().then(t.bind(t,4798)),Promise.resolve().then(t.t.bind(t,400,23))},4005:(e,n,t)=>{"use strict";t.d(n,{PartnerStatus:()=>d});var r=t(5155),s=t(2115),l=t(8173),o=t.n(l),i=t(1490),a=t(6662);let c=e=>{let{context:{account:n,library:t},token:l,controller:i}=e,[c,d]=(0,s.useState)(!1),[u,h]=(0,s.useState)(null),[m,b]=(0,s.useState)(null);return((0,a.Zu)(async()=>{h(null),b(null);let e=t.utils.toBigInt(await l.methods.balanceOf(n).call());if(!e){d(!1);return}h(e),d(!0),b(t.utils.toBigInt(await i.methods.getUnclaimedRevenue(n).call()))},[n,i,l,t]),c)?(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("h2",{children:"Account Status"}),(0,r.jsx)("p",{children:"Greetings, esteemed partner!"}),(0,r.jsxs)("p",{children:["You are connected as:"," ",(0,r.jsx)(o(),{href:"https://".concat("polygonscan.com","/address/").concat(n),target:"_blank",rel:"noreferrer",children:n})]}),u?(0,r.jsxs)("p",{children:["Your ",(0,r.jsx)("code",{children:"EXL"})," balance is: ",(0,a.TZ)(t,u)]}):null,m?(0,r.jsxs)("p",{children:["You have unclaimed fees: $ ",(0,a.TZ)(t,m)," –"," ",(0,r.jsx)("button",{onClick:async()=>{await i.methods.withdraw(n).send({from:n})},children:"withdraw"})]}):null]}):null},d=()=>{let{context:e,lottery:n}=(0,i.z)(),[t,l]=(0,s.useState)(null),[o,d]=(0,s.useState)(null);return((0,a.Zu)(async()=>{if(!n)return;let[e,t]=await Promise.all([n.getGovernanceToken(),n.getController()]);l(e),d(t)},[n]),(null==e?void 0:e.account)&&t&&o)?(0,r.jsx)(c,{context:e,token:t,controller:o}):null}},1491:()=>{},400:()=>{}},e=>{var n=n=>e(e.s=n);e.O(0,[562,649,586,506,370,774,441,517,358],()=>n(2002)),_N_E=e.O()}]);