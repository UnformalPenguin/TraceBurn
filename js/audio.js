window.GameAudio = (() => {
  let ctx=null, enabled=true;
  function ensure(){ if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)(); if(ctx.state==="suspended")ctx.resume(); }
  function tone(freq=440,duration=.04,type="square",gain=.025,slide=0,delay=0){
    if(!enabled)return; ensure();
    const osc=ctx.createOscillator(),amp=ctx.createGain(),now=ctx.currentTime+delay;
    osc.type=type; osc.frequency.setValueAtTime(freq,now);
    if(slide)osc.frequency.linearRampToValueAtTime(Math.max(30,freq+slide),now+duration);
    amp.gain.setValueAtTime(gain,now); amp.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(amp).connect(ctx.destination); osc.start(now); osc.stop(now+duration);
  }
  function noise(duration=.05,gain=.008,delay=0){
    if(!enabled)return; ensure();
    const length=Math.max(1,Math.floor(ctx.sampleRate*duration));
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(1-i/length);
    const src=ctx.createBufferSource(),amp=ctx.createGain(),filter=ctx.createBiquadFilter(),now=ctx.currentTime+delay;
    src.buffer=buffer; filter.type="bandpass"; filter.frequency.value=1200; filter.Q.value=.7;
    amp.gain.setValueAtTime(gain,now); amp.gain.exponentialRampToValueAtTime(.0001,now+duration);
    src.connect(filter).connect(amp).connect(ctx.destination); src.start(now); src.stop(now+duration);
  }
  return {
    key(combo=1){
      const lift=Math.min(120,(combo-1)*14);
      tone(535+lift,.022,"square",.009,55); tone(910+lift,.018,"sine",.004,-40,.012);
    },
    error(){ tone(125,.085,"sawtooth",.028,-75); noise(.08,.012); },
    lock(){ tone(255,.055,"triangle",.025,285); tone(655,.045,"sine",.014,-70,.038); noise(.03,.004,.02); },
    eliteHit(){ tone(72,.055,"sine",.014,-12); },
    destroy(elite=false){
      tone(elite?145:210,elite?.18:.11,"sawtooth",elite?.035:.025,elite?690:560);
      tone(elite?720:780,elite?.12:.075,"triangle",.016,-180,.04);
      noise(elite?.13:.075,elite?.018:.009,.015);
    },
    combo(level=2){
      const n=Math.max(2,Math.min(10,level));
      const root=330+n*34;
      tone(root,.065,"triangle",.018,115);
      tone(root*1.26,.06,"sine",.014,90,.045);
      if(n>=4) tone(root*1.5,.085,"triangle",.012,125,.085);
      if(n>=6) tone(root*2,.09,"sine",.01,160,.13);
    },
    start(){ tone(175,.16,"square",.025,520); tone(420,.13,"triangle",.018,330,.11); },
    phase(){ tone(260,.13,"sawtooth",.018,390); tone(520,.15,"triangle",.015,380,.08); noise(.12,.01,.04); },
    deepAccess(){
      tone(110,.32,"sawtooth",.026,760); tone(330,.24,"triangle",.018,520,.12); tone(920,.18,"sine",.012,-210,.25); noise(.22,.012,.06);
    },
    deepMode(mode){
      if(mode === "matrix"){ tone(420,.09,"square",.015,150); tone(710,.11,"triangle",.013,-90,.07); tone(980,.08,"sine",.01,-130,.15); }
      else { tone(250,.08,"triangle",.016,180); tone(520,.09,"square",.011,220,.07); }
    },
    matrixGo(){ tone(880,.05,"square",.013,-220); tone(540,.06,"triangle",.012,130,.055); },
    deepSuccess(level=1){
      const lift=Math.min(360,level*22); tone(360+lift,.075,"triangle",.02,170); tone(620+lift,.09,"sine",.014,210,.055); noise(.055,.006,.02);
    },
    gameOver(){ tone(170,.5,"sawtooth",.035,-110); },
    setEnabled(v){enabled=!!v;}, isEnabled(){return enabled;}
  };
})();
