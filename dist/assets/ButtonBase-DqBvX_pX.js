import{D as e,E as t,G as n,Q as r,T as i,U as a,X as o,a as s,o as c,q as l,u,v as d}from"./Box-S-XmNk_F.js";var f=r(o()),p=typeof window<`u`?f.useLayoutEffect:f.useEffect;function m(e){let t=f.useRef(e);return p(()=>{t.current=e}),f.useRef((...e)=>(0,t.current)(...e)).current}var h=m,g=s;function _(e,t){if(e==null)return{};var n={};for(var r in e)if({}.hasOwnProperty.call(e,r)){if(t.indexOf(r)!==-1)continue;n[r]=e[r]}return n}function v(e,t){return v=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},v(e,t)}function y(e,t){e.prototype=Object.create(t.prototype),e.prototype.constructor=e,v(e,t)}var b=f.createContext(null);function x(e){if(e===void 0)throw ReferenceError(`this hasn't been initialised - super() hasn't been called`);return e}function S(e,t){var n=function(e){return t&&(0,f.isValidElement)(e)?t(e):e},r=Object.create(null);return e&&f.Children.map(e,function(e){return e}).forEach(function(e){r[e.key]=n(e)}),r}function C(e,t){e||={},t||={};function n(n){return n in t?t[n]:e[n]}var r=Object.create(null),i=[];for(var a in e)a in t?i.length&&(r[a]=i,i=[]):i.push(a);var o,s={};for(var c in t){if(r[c])for(o=0;o<r[c].length;o++){var l=r[c][o];s[r[c][o]]=n(l)}s[c]=n(c)}for(o=0;o<i.length;o++)s[i[o]]=n(i[o]);return s}function w(e,t,n){return n[t]==null?e.props[t]:n[t]}function T(e,t){return S(e.children,function(n){return(0,f.cloneElement)(n,{onExited:t.bind(null,n),in:!0,appear:w(n,`appear`,e),enter:w(n,`enter`,e),exit:w(n,`exit`,e)})})}function E(e,t,n){var r=S(e.children),i=C(t,r);return Object.keys(i).forEach(function(a){var o=i[a];if((0,f.isValidElement)(o)){var s=a in t,c=a in r,l=t[a],u=(0,f.isValidElement)(l)&&!l.props.in;c&&(!s||u)?i[a]=(0,f.cloneElement)(o,{onExited:n.bind(null,o),in:!0,exit:w(o,`exit`,e),enter:w(o,`enter`,e)}):!c&&s&&!u?i[a]=(0,f.cloneElement)(o,{in:!1}):c&&s&&(0,f.isValidElement)(l)&&(i[a]=(0,f.cloneElement)(o,{onExited:n.bind(null,o),in:l.props.in,exit:w(o,`exit`,e),enter:w(o,`enter`,e)}))}}),i}var D=Object.values||function(e){return Object.keys(e).map(function(t){return e[t]})},O={component:`div`,childFactory:function(e){return e}},k=function(e){y(t,e);function t(t,n){var r=e.call(this,t,n)||this;return r.state={contextValue:{isMounting:!0},handleExited:r.handleExited.bind(x(r)),firstRender:!0},r}var n=t.prototype;return n.componentDidMount=function(){this.mounted=!0,this.setState({contextValue:{isMounting:!1}})},n.componentWillUnmount=function(){this.mounted=!1},t.getDerivedStateFromProps=function(e,t){var n=t.children,r=t.handleExited;return{children:t.firstRender?T(e,r):E(e,n,r),firstRender:!1}},n.handleExited=function(e,t){var n=S(this.props.children);e.key in n||(e.props.onExited&&e.props.onExited(t),this.mounted&&this.setState(function(t){var n=l({},t.children);return delete n[e.key],{children:n}}))},n.render=function(){var e=this.props,t=e.component,n=e.childFactory,r=_(e,[`component`,`childFactory`]),i=this.state.contextValue,a=D(this.state.children).map(n);return delete r.appear,delete r.enter,delete r.exit,t===null?f.createElement(b.Provider,{value:i},a):f.createElement(b.Provider,{value:i},f.createElement(t,r,a))},t}(f.Component);k.propTypes={},k.defaultProps=O;var A={};function j(e,t){let n=f.useRef(A);return n.current===A&&(n.current=e(t)),n}var M=[];function N(e){f.useEffect(e,M)}var P=class e{static create(){return new e}currentId=null;start(e,t){this.clear(),this.currentId=setTimeout(()=>{this.currentId=null,t()},e)}clear=()=>{this.currentId!==null&&(clearTimeout(this.currentId),this.currentId=null)};disposeEffect=()=>this.clear};function F(){let e=j(P.create).current;return N(e.disposeEffect),e}function I(e){try{return e.matches(`:focus-visible`)}catch{}return!1}var L=class e{static create(){return new e}static use(){let t=j(e.create).current,[n,r]=f.useState(!1);return t.shouldMount=n,t.setShouldMount=r,f.useEffect(t.mountEffect,[n]),t}constructor(){this.ref={current:null},this.mounted=null,this.didMount=!1,this.shouldMount=!1,this.setShouldMount=null}mount(){return this.mounted||(this.mounted=R(),this.shouldMount=!0,this.setShouldMount(this.shouldMount)),this.mounted}mountEffect=()=>{this.shouldMount&&!this.didMount&&this.ref.current!==null&&(this.didMount=!0,this.mounted.resolve())};start(...e){this.mount().then(()=>this.ref.current?.start(...e))}stop(...e){this.mount().then(()=>this.ref.current?.stop(...e))}pulsate(...e){this.mount().then(()=>this.ref.current?.pulsate(...e))}};function ee(){return L.use()}function R(){let e,t,n=new Promise((n,r)=>{e=n,t=r});return n.resolve=e,n.reject=t,n}var z=a();function B(t){let{className:n,classes:r,pulsate:i=!1,rippleX:a,rippleY:o,rippleSize:s,in:c,onExited:l,timeout:u}=t,[d,p]=f.useState(!1),m=e(n,r.ripple,r.rippleVisible,i&&r.ripplePulsate),h={width:s,height:s,top:-(s/2)+o,left:-(s/2)+a},g=e(r.child,d&&r.childLeaving,i&&r.childPulsate);return!c&&!d&&p(!0),f.useEffect(()=>{if(!c&&l!=null){let e=setTimeout(l,u);return()=>{clearTimeout(e)}}},[l,c,u]),(0,z.jsx)(`span`,{className:m,style:h,children:(0,z.jsx)(`span`,{className:g})})}var V=i(`MuiTouchRipple`,[`root`,`ripple`,`rippleVisible`,`ripplePulsate`,`child`,`childLeaving`,`childPulsate`]),H=550,U=n`
  0% {
    transform: scale(0);
    opacity: 0.1;
  }

  100% {
    transform: scale(1);
    opacity: 0.3;
  }
`,W=n`
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
`,te=n`
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.92);
  }

  100% {
    transform: scale(1);
  }
`,G=u(`span`,{name:`MuiTouchRipple`,slot:`Root`})({overflow:`hidden`,pointerEvents:`none`,position:`absolute`,zIndex:0,top:0,right:0,bottom:0,left:0,borderRadius:`inherit`}),K=u(B,{name:`MuiTouchRipple`,slot:`Ripple`})`
  opacity: 0;
  position: absolute;

  &.${V.rippleVisible} {
    opacity: 0.3;
    transform: scale(1);
    animation-name: ${U};
    animation-duration: ${H}ms;
    animation-timing-function: ${({theme:e})=>e.transitions.easing.easeInOut};
  }

  &.${V.ripplePulsate} {
    animation-duration: ${({theme:e})=>e.transitions.duration.shorter}ms;
  }

  & .${V.child} {
    opacity: 1;
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: currentColor;
  }

  & .${V.childLeaving} {
    opacity: 0;
    animation-name: ${W};
    animation-duration: ${H}ms;
    animation-timing-function: ${({theme:e})=>e.transitions.easing.easeInOut};
  }

  & .${V.childPulsate} {
    position: absolute;
    /* @noflip */
    left: 0px;
    top: 0;
    animation-name: ${te};
    animation-duration: 2500ms;
    animation-timing-function: ${({theme:e})=>e.transitions.easing.easeInOut};
    animation-iteration-count: infinite;
    animation-delay: 200ms;
  }
`,ne=f.forwardRef(function(t,n){let{center:r=!1,classes:i={},className:a,...o}=c({props:t,name:`MuiTouchRipple`}),[s,l]=f.useState([]),u=f.useRef(0),d=f.useRef(null);f.useEffect(()=>{d.current&&=(d.current(),null)},[s]);let p=f.useRef(!1),m=F(),h=f.useRef(null),g=f.useRef(null),_=f.useCallback(t=>{let{pulsate:n,rippleX:r,rippleY:a,rippleSize:o,cb:s}=t;l(t=>[...t,(0,z.jsx)(K,{classes:{ripple:e(i.ripple,V.ripple),rippleVisible:e(i.rippleVisible,V.rippleVisible),ripplePulsate:e(i.ripplePulsate,V.ripplePulsate),child:e(i.child,V.child),childLeaving:e(i.childLeaving,V.childLeaving),childPulsate:e(i.childPulsate,V.childPulsate)},timeout:H,pulsate:n,rippleX:r,rippleY:a,rippleSize:o},u.current)]),u.current+=1,d.current=s},[i]),v=f.useCallback((e={},t={},n=()=>{})=>{let{pulsate:i=!1,center:a=r||t.pulsate,fakeElement:o=!1}=t;if(e?.type===`mousedown`&&p.current){p.current=!1;return}e?.type===`touchstart`&&(p.current=!0);let s=o?null:g.current,c=s?s.getBoundingClientRect():{width:0,height:0,left:0,top:0},l,u,d;if(a||e===void 0||e.clientX===0&&e.clientY===0||!e.clientX&&!e.touches)l=Math.round(c.width/2),u=Math.round(c.height/2);else{let{clientX:t,clientY:n}=e.touches&&e.touches.length>0?e.touches[0]:e;l=Math.round(t-c.left),u=Math.round(n-c.top)}if(a)d=Math.sqrt((2*c.width**2+c.height**2)/3),d%2==0&&(d+=1);else{let e=Math.max(Math.abs((s?s.clientWidth:0)-l),l)*2+2,t=Math.max(Math.abs((s?s.clientHeight:0)-u),u)*2+2;d=Math.sqrt(e**2+t**2)}e?.touches?h.current===null&&(h.current=()=>{_({pulsate:i,rippleX:l,rippleY:u,rippleSize:d,cb:n})},m.start(80,()=>{h.current&&=(h.current(),null)})):_({pulsate:i,rippleX:l,rippleY:u,rippleSize:d,cb:n})},[r,_,m]),y=f.useCallback(()=>{v({},{pulsate:!0})},[v]),b=f.useCallback((e,t)=>{if(m.clear(),e?.type===`touchend`&&h.current){h.current(),h.current=null,m.start(0,()=>{b(e,t)});return}h.current=null,l(e=>e.length>0?e.slice(1):e),d.current=t},[m]);return f.useImperativeHandle(n,()=>({pulsate:y,start:v,stop:b}),[y,v,b]),(0,z.jsx)(G,{className:e(V.root,i.root,a),ref:g,...o,children:(0,z.jsx)(k,{component:null,exit:!0,children:s})})});function q(e){return t(`MuiButtonBase`,e)}var J=i(`MuiButtonBase`,[`root`,`disabled`,`focusVisible`]),re=e=>{let{disabled:t,focusVisible:n,focusVisibleClassName:r,classes:i}=e,a=d({root:[`root`,t&&`disabled`,n&&`focusVisible`]},q,i);return n&&r&&(a.root+=` ${r}`),a},ie=u(`button`,{name:`MuiButtonBase`,slot:`Root`})({display:`inline-flex`,alignItems:`center`,justifyContent:`center`,position:`relative`,boxSizing:`border-box`,WebkitTapHighlightColor:`transparent`,backgroundColor:`transparent`,outline:0,border:0,margin:0,borderRadius:0,padding:0,cursor:`pointer`,userSelect:`none`,verticalAlign:`middle`,MozAppearance:`none`,WebkitAppearance:`none`,textDecoration:`none`,color:`inherit`,"&::-moz-focus-inner":{borderStyle:`none`},[`&.${J.disabled}`]:{pointerEvents:`none`,cursor:`default`},"@media print":{colorAdjust:`exact`}}),Y=f.forwardRef(function(t,n){let r=c({props:t,name:`MuiButtonBase`}),{action:i,centerRipple:a=!1,children:o,className:s,component:l=`button`,disabled:u=!1,disableRipple:d=!1,disableTouchRipple:p=!1,focusRipple:m=!1,focusVisibleClassName:_,LinkComponent:v=`a`,onBlur:y,onClick:b,onContextMenu:x,onDragLeave:S,onFocus:C,onFocusVisible:w,onKeyDown:T,onKeyUp:E,onMouseDown:D,onMouseLeave:O,onMouseUp:k,onTouchEnd:A,onTouchMove:j,onTouchStart:M,tabIndex:N=0,TouchRippleProps:P,touchRippleRef:F,type:L,...R}=r,B=f.useRef(null),V=ee(),H=g(V.ref,F),[U,W]=f.useState(!1);u&&U&&W(!1),f.useImperativeHandle(i,()=>({focusVisible:()=>{W(!0),B.current.focus()}}),[]);let te=V.shouldMount&&!d&&!u;f.useEffect(()=>{U&&m&&!d&&V.pulsate()},[d,m,U,V]);let G=X(V,`start`,D,p),K=X(V,`stop`,x,p),q=X(V,`stop`,S,p),J=X(V,`stop`,k,p),Y=X(V,`stop`,e=>{U&&e.preventDefault(),O&&O(e)},p),ae=X(V,`start`,M,p),oe=X(V,`stop`,A,p),se=X(V,`stop`,j,p),ce=X(V,`stop`,e=>{I(e.target)||W(!1),y&&y(e)},!1),le=h(e=>{B.current||=e.currentTarget,I(e.target)&&(W(!0),w&&w(e)),C&&C(e)}),Z=()=>{let e=B.current;return l&&l!==`button`&&!(e.tagName===`A`&&e.href)},ue=h(e=>{m&&!e.repeat&&U&&e.key===` `&&V.stop(e,()=>{V.start(e)}),e.target===e.currentTarget&&Z()&&e.key===` `&&e.preventDefault(),T&&T(e),e.target===e.currentTarget&&Z()&&e.key===`Enter`&&!u&&(e.preventDefault(),b&&b(e))}),de=h(e=>{m&&e.key===` `&&U&&!e.defaultPrevented&&V.stop(e,()=>{V.pulsate(e)}),E&&E(e),b&&e.target===e.currentTarget&&Z()&&e.key===` `&&!e.defaultPrevented&&b(e)}),Q=l;Q===`button`&&(R.href||R.to)&&(Q=v);let $={};if(Q===`button`){let e=!!R.formAction;$.type=L===void 0&&!e?`button`:L,$.disabled=u}else !R.href&&!R.to&&($.role=`button`),u&&($[`aria-disabled`]=u);let fe=g(n,B),pe={...r,centerRipple:a,component:l,disabled:u,disableRipple:d,disableTouchRipple:p,focusRipple:m,tabIndex:N,focusVisible:U},me=re(pe);return(0,z.jsxs)(ie,{as:Q,className:e(me.root,s),ownerState:pe,onBlur:ce,onClick:b,onContextMenu:K,onFocus:le,onKeyDown:ue,onKeyUp:de,onMouseDown:G,onMouseLeave:Y,onMouseUp:J,onDragLeave:q,onTouchEnd:oe,onTouchMove:se,onTouchStart:ae,ref:fe,tabIndex:u?-1:N,type:L,...$,...R,children:[o,te?(0,z.jsx)(ne,{ref:H,center:a,...P}):null]})});function X(e,t,n,r=!1){return h(i=>(n&&n(i),r||e[t](i),!0))}export{b as a,g as c,p as d,F as i,h as l,I as n,y as o,P as r,_ as s,Y as t,m as u};