"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";

export default function BlackJackComponent({user}) {
  const suits = ["hearts", "diamonds", "spades", "clubs"];
  const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

  const [profile, setProfile] = useState(null); // thêm
  const [balance, setBalance] = useState(0); // khởi tạo tạm 0

  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  //const [balance, setBalance] = useState(1000);
  const [currentBet, setCurrentBet] = useState(10);
  const [status, setStatus] = useState('Press "New Round" to start!');
  const [statusType, setStatusType] = useState("neutral");
  const [gameOver, setGameOver] = useState(true);
  const [popup, setPopup] = useState({show:false,message:"",detail:""});
  const [specialEffect, setSpecialEffect] = useState(null);

  const chipValues = [1000, 5000, 10000, 100000, 500000, 1000000]; // giá trị thực tế

  useEffect(() => {
  if(!user?.id) return;
  let isMounted = true;

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if(error) {
        console.error(error);
        return;
      }

      if(isMounted) {
        setProfile(data);
        setBalance(data.coin); // cập nhật balance
      }
    } catch(err) {
      console.error(err);
    }
  };

  fetchProfile();

  // Realtime subscription
  const channel = supabase
    .channel(`profile:${user.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
      (payload) => {
        if(isMounted) {
          setProfile(payload.new);
          setBalance(payload.new.coin);
        }
      }
    )
    .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // --- Helpers ---
  const shuffle = (array) => {
    for(let i=array.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };
  const createDeck = () => shuffle(suits.flatMap(s => values.map(v => ({suit:s,value:v}))));

  const getCardValue = (card) => {
    if(!card) return 0;
    if(["J","Q","K"].includes(card.value)) return 10;
    if(card.value==="A") return 11;
    return parseInt(card.value,10) || 0;
  };
  
  const getHandValue = (hand) => {
    let val = 0, aces = 0;
    hand.forEach(c => { if(!c) return; val += getCardValue(c); if(c.value==="A") aces++; });
    while(val>21 && aces>0){ val-=10; aces--; }
    return val;
  };

  // Special rules
  const isNguLinh = (hand) => Array.isArray(hand) && hand.length===5 && getHandValue(hand) <= 21;
  const isNhaHoang = (hand) => Array.isArray(hand) && hand.length===2 && hand.filter(c=>c && c.value==="A").length===2;
  const isDenBai = (hand, isStand=false) => {
    if (!Array.isArray(hand)) return false;
    const value = getHandValue(hand);
    if (value >= 28) return true;         // Quá 28 luôn đền bài
    if (value < 16) return true; // Đứng <16 điểm cũng đền bài
    return false;
  };

  const isDealerDenBai = (dealerVal, playerVal) => {
    return dealerVal < 15 && playerVal >= 16;
  };
  
   // Hàm trừ / cộng coin
  const payWin = async (amt) => {
    if (!profile || !user) return;
    const newCoin = profile.coin + amt;

    await supabase
      .from("profiles")
      .update({ coin: newCoin })
      .eq("id", user.id);

    setProfile(prev => ({ ...prev, coin: newCoin }));
    setBalance(newCoin);
  };

  const deduct = async (amt) => {
    if (!profile || !user) return;
    const newCoin = profile.coin - amt;

    await supabase
      .from("profiles")
      .update({ coin: newCoin })
      .eq("id", user.id);

    setProfile(prev => ({ ...prev, coin: newCoin }));
    setBalance(newCoin);
  };

  const sleep = (ms) => new Promise(r=>setTimeout(r,ms));

  const revealDealerHole = () => {
    setDealerHand(dh => dh.map(c => c ? {...c,__isHole:false} : c));
  };

  const triggerEffect = (type) => {
    setSpecialEffect(type);
    // auto-clear after 3s (animation duration)
    setTimeout(()=>setSpecialEffect(null), 3000);
  };

  const endRound = (msg, detail="", win=null) => {
    revealDealerHole();
    setGameOver(true);
    if(win===true) setStatusType("win");
    else if(win===false) setStatusType("lose");
    else setStatusType("draw");
    setTimeout(()=>{ setPopup({show:true,message:msg,detail}); }, 700);
  };

  // Dealer draw decision according to updated rules
  const dealerShouldDraw = (dealerVal, playerHandSnapshot) => {
    // rule: if dealer < 15 -> must draw
    if(dealerVal < 15) return true;
    // if player is Ngũ linh or Nhà Hoàng and dealer <= 18 then draw
    if((isNguLinh(playerHandSnapshot) || isNhaHoang(playerHandSnapshot)) && dealerVal <= 18) return true;
    // if player has 2 lá and dealer <= 16 -> draw
    if(playerHandSnapshot.length === 2 && dealerVal <= 16) return true;
    // if player has >=3 lá and dealer >=15 -> do NOT draw
    if(playerHandSnapshot.length >= 3 && dealerVal >= 15) return false;
    // otherwise default: do not draw
    return false;
  };

  // --- Player actions ---
  const playerHit = async () => {
    if(gameOver) return;
    if(deck.length === 0) return;
    const localDeck = [...deck];
    const card = localDeck.pop();
    const cardObj = {...card};
    const newHand = [...playerHand, cardObj];
    setPlayerHand(newHand);
    setDeck(localDeck);

    // Check Ngũ linh immediately (priority)
    if(isNguLinh(newHand)){
      triggerEffect("ngulinh");
      // small delay to show animation then stand
      await sleep(400);
      await playerStand(newHand);
      return;
    }

    const val = getHandValue(newHand);
    if(val>21) {
      setStatus(`You BUST with ${val}. Please press "Stand".`);
      setStatusType("lose");
    } else {
      setStatus(`Hit or Stand.`);
      setStatusType("neutral");
    }
  };

  // allow passing player's snapshot for immediate cases
  const playerStand = async (playerHandSnapshot = null) => {
    if(gameOver) return;
    const pSnap = playerHandSnapshot || playerHand;
    setStatus("Dealer is playing...");
    setStatusType("neutral");
    await sleep(300);
    // reveal hole then dealer plays
    revealDealerHole();
    await sleep(300);

    // use local deck copy to draw
    const localDeck = [...deck];
    // pass snapshot so dealer logic can use correct player size/specials
    await dealerPlay([...dealerHand], localDeck, pSnap);
    // dealerPlay updates dealerHand and localDeck; sync deck state
    setDeck(localDeck);
  };

  // --- Dealer logic ---
  const dealerPlay = async (tempDealer, localDeck, playerSnapshot) => {
    // ensure no hidden hole in computation (values don't depend on __isHole)
    let dealerVal = getHandValue(tempDealer);

    while(true){
      // evaluate draw decision
      const shouldDraw = dealerShouldDraw(dealerVal, playerSnapshot);
      if(!shouldDraw) break;

      // draw card
      await sleep(650);
      const card = localDeck.pop();
      if(!card) break;
      tempDealer.push(card);
      // update dealer display
      setDealerHand([...tempDealer]);
      dealerVal = getHandValue(tempDealer);
      // continue loop to reevaluate
    }

    // Finalize
    setDealerHand([...tempDealer]);
    // resolve with current snapshot of player
    resolveRound(tempDealer, playerSnapshot);
  };

  // --- Resolve round ---
  const resolveRound = (dealerFinalHand, playerFinalHand) => {
    const playerVal = getHandValue(playerFinalHand);
    const dealerVal = getHandValue(dealerFinalHand);

    // 1) Handle special priorities FIRST (Ngũ linh > Nhà Hoàng > normal)
    // PLAYER special wins
    if (isNguLinh(playerFinalHand)) {
      if (isNguLinh(dealerFinalHand)) {
        // Cả 2 Ngũ Linh → Hòa
        payWin(currentBet); // hoàn lại tiền cược
        return endRound("Cả 2 Ngũ Linh! Hòa.", `Player: ${playerVal} — Dealer: ${dealerVal}`, null);
      } else {
        // Chỉ Player Ngũ Linh → Player thắng
        triggerEffect("ngulinh");
        payWin(currentBet * 2);
        return endRound("Ngũ Linh! Bạn thắng ưu tiên.", `Player: ${playerVal} — Dealer: ${dealerVal}`, true);
      }
    }
    if (isNhaHoang(playerFinalHand)) {
      if (isNguLinh(dealerFinalHand)) {
        // Dealer Ngũ Linh vẫn thắng Player Nhà Hoàng
        triggerEffect("ngulinh");
        deduct(currentBet);
        return endRound("Dealer Ngũ Linh! Bạn thua gấp đôi.", `Player: ${playerVal} — Dealer: ${dealerVal}`, false);
      } else if (isNhaHoang(dealerFinalHand)) {
        // Cả 2 Nhà Hoàng → hòa
        payWin(currentBet);
        return endRound("Cả 2 Nhà Hoàng! Hòa.", `Player: ${playerVal} — Dealer: ${dealerVal}`, null);
      } else {
        // Chỉ Player Nhà Hoàng → thắng
        triggerEffect("nhaohoang");
        payWin(currentBet * 2);
        return endRound("Nhà Hoàng! Bạn thắng ưu tiên.", `Player: ${playerVal} — Dealer: ${dealerVal}`, true);
      }
    }
    if(isDenBai(playerFinalHand)){
      // Player đền bài → mất tổng 2×bet (chúng ta đã trừ 1×bet khi bắt đầu round)
      triggerEffect("denbai");
      deduct(currentBet); // trừ thêm 1×bet => tổng mất 2×bet
      return endRound("Đền bài! Bạn mất gấp đôi.", `Player: ${playerVal} — Dealer: ${dealerVal}`, false);
    }

    // DEALER special wins
    if(isNguLinh(dealerFinalHand)){
      triggerEffect("ngulinh");
      // Dealer Ngũ linh => player thua gấp đôi: chúng ta đã trừ 1×bet, trừ thêm 1×bet
      deduct(currentBet);
      return endRound("Dealer Ngũ linh! Bạn thua gấp đôi.", `Player: ${playerVal} — Dealer: ${dealerVal}`, false);
    }
    if(isNhaHoang(dealerFinalHand)){
      triggerEffect("nhaohoang");
      deduct(currentBet);
      return endRound("Dealer Nhà Hoàng! Bạn thua gấp đôi.", `Player: ${playerVal} — Dealer: ${dealerVal}`, false);
    }
    

    // Normal comparisons
    if(playerVal>21){
      // player busts -> already lost initial bet
      return endRound("LOSE!",`Player: ${playerVal} — Dealer: ${dealerVal}`, false);
    } else if(dealerVal>21){
      // dealer bust -> player wins (pay back 2×bet)
      payWin(currentBet*2);
      return endRound("WIN!",`Player: ${playerVal} — Dealer: ${dealerVal}`, true);
    } else if(playerVal>dealerVal){
      payWin(currentBet*2);
      return endRound("WIN!",`Player: ${playerVal} — Dealer: ${dealerVal}`, true);
    } else if(playerVal<dealerVal){
      return endRound("LOSE!",`Player: ${playerVal} — Dealer: ${dealerVal}`, false);
    } else {
      // draw -> return bet
      payWin(currentBet);
      return endRound("DRAW!",`Player: ${playerVal} — Dealer: ${dealerVal}`, null);
    }
  };

  // --- Start new round ---
  const startNewRound = () => {
  if (!gameOver) {
    setStatus("Finish current round before starting new.");
    setStatusType("neutral");
    return;
  }

  if (currentBet * 2 > balance) {
    setStatus("Need at least 2x TOKEN to bet.");
    setStatusType("neutral");
    return;
  }

  // --- Prepare deck and hands ---
  const localDeck = createDeck();
  const pHand = [];
  const dHand = [];

  // Deduct initial bet
  deduct(currentBet);

  // Reset hands and game state
  setPlayerHand([]);
  setDealerHand([]);
  setGameOver(false);
  setStatus("Dealing...");
  setStatusType("neutral");

  // --- Deal cards with delay ---
  const dealNext = (i) => {
    let card;
    switch(i){
      case 0:
        card = localDeck.pop();
        pHand.push(card);
        setPlayerHand([...pHand]);
        break;
      case 1:
        card = localDeck.pop();
        dHand.push(card); // first dealer card visible
        setDealerHand([...dHand]);
        break;
      case 2:
        card = localDeck.pop();
        pHand.push(card);
        setPlayerHand([...pHand]);
        break;
      case 3:
        card = localDeck.pop();
        dHand.push({...card, __isHole:true}); // dealer hole card hidden
        setDealerHand([...dHand]);
        break;
      default:
        break;
    }

    if(i < 3){
      setTimeout(()=> dealNext(i+1), 500); // 500ms delay
    } else {
      // update remaining deck after all 4 cards dealt
      setDeck([...localDeck]);
      setStatus(`Player: ${getHandValue(pHand)}. Hit hoặc Stand.`);
      setStatusType("neutral");
    }
  };

  dealNext(0);
};


  // --- UI Styles ---
  const chipButton = (val) => ({
    margin:"8px", padding:"14px 26px", borderRadius:"50%",
    background: currentBet===val 
      ? "linear-gradient(145deg,#b91c1c,#ef4444)" 
      : "linear-gradient(145deg,#ffd700,#ffae00)",
    color:"gold",
    fontWeight:"bold", fontSize:"18px", cursor:"pointer",
    border: currentBet===val ? "3px solid #fff" : "2px solid #ffd700",
    boxShadow: currentBet===val 
      ? "0 0 15px #ff0000, inset 0 0 8px #660000" 
      : "0 0 15px gold, inset 0 0 8px #333",
    transition:"all 0.25s ease",
  });

  const buttonStyle = {
    margin:"6px", padding:"12px 20px", borderRadius:"24px", border:"none",
    background:"linear-gradient(145deg,#ffd700,#ffea70)", 
    color:"#071428", fontWeight:"bold", cursor:"pointer",
    boxShadow:"0 2px 8px rgba(255,215,0,0.5)",
    transition:"all 0.25s ease"
  };

  const statusColors = {
    win:"linear-gradient(90deg,#1f8a3a,#38d95f)",
    lose:"linear-gradient(90deg,#b91c1c,#ef4444)",
    draw:"linear-gradient(90deg,#a16207,#facc15)",
    neutral:"linear-gradient(90deg,#374151,#6b7280)"
  };

  const getSuitSymbol = (suit) => {
    switch(suit){
      case "hearts": return "♥";
      case "diamonds": return "♦";
      case "spades": return "♠";
      case "clubs": return "♣";
      default: return "";
    }
  };

  function cardStyle(c){
    return {
      width:"90px", height:"130px", borderRadius:"12px",
      border:"2px solid #555",
      background:c && c.__isHole ? "linear-gradient(135deg,#2a3b4c,#0f1a24)" : "white",
      color:c && c.__isHole ? "transparent" : (c && (c.suit==="hearts"||c.suit==="diamonds")?"red":"black"),
      display:"flex", flexDirection:"column", justifyContent:"space-between",
      padding:"8px", fontWeight:"bold", fontSize:"20px", textAlign:"center",
      boxShadow:"2px 2px 8px rgba(0,0,0,0.6)"
    };
  }

  // --- Special overlay animation variants ---
  const overlayVariants = {
    initial: { scale: 0, opacity: 0, y: -50, rotate: 0 },
    animate: { scale: 1.25, opacity: 1, y: 0, rotate: 360 },
    exit: { scale: 0, opacity: 0, y: 50, rotate: 720 }
  };

  return (
    <div style={{
      textAlign:"center", padding:"20px", color:"white", fontFamily:"Arial, sans-serif",
      background:"linear-gradient(160deg,#0a0f1f,#1a1033,#0d1a26)", minHeight:"100vh"
    }}>
      <style>{`
        /* extra decorations */
        .glow-gold { text-shadow: 0 0 10px #ffd700; }
      `}</style>
      
      {/*
      <h2 style={{marginBottom:"10px", fontSize:"3em", textShadow:"0 0 12px #ffd700"}}>
        ♠️♥️ BLACKJACK ♦️♣️
      </h2>
      */}

      {/* Chip Betting Panel */}
      <div style={{
        border:"3px solid #00ffcc", borderRadius:"16px",
        padding:"14px", marginBottom:"20px",
        background:"linear-gradient(145deg,#021f29,#043d4a)",
        boxShadow:"0 0 20px #00ffcc"
      }}>
        <div style={{fontWeight:"bold",color:"gold",marginBottom:"10px"}}>CHOOSE YOUR BET</div>
        <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap"}}>
          {chipValues.map(v=>(
      <button 
        key={v} 
        style={chipButton(v)} 
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.12)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
        onClick={()=>{
          if(v*2 <= balance) setCurrentBet(v);
          else {
            setStatus("Need at least 2x TOKEN for this bet!");
            setStatusType("neutral");
          }
        }}
      >
        {v >= 1000000 ? v/1000000 + "M" :
        v >= 1000 ? v/1000 + "K" :
        v}
      </button>
    ))}

        </div>
      </div>

      {/* Token 
      <div style={{
        marginBottom:"20px",
        background:"linear-gradient(145deg,#0a1f33,#123b4a)",
        padding:"14px 28px",
        borderRadius:"14px",
        border:"2px solid #ffd700",
        fontSize:"22px",
        boxShadow:"0 0 15px #ffd700,inset 0 0 10px #000",
        fontWeight:"bold",
        display:"inline-flex",
        alignItems:"center",
        gap:"10px"
      }}>
        <span style={{fontSize:"26px",filter:"drop-shadow(0 0 6px gold)"}}>💰</span>
        Token: {balance}
      </div>
        */}

      {/* Dealer */}
      <h2 style={{fontSize:"28px", textShadow:"0 0 8px cyan", marginBottom:"8px"}}>DEALER</h2>
      <div style={{
        display:"flex", minHeight:"160px", border:"3px solid #ffd700", borderRadius:"14px",
        padding:"12px", marginBottom:"20px", overflowX:"auto", justifyContent:"center",
        background:"radial-gradient(circle,#043b2e,#021d16)", boxShadow:"0 0 12px #0ff inset"
      }}>
        {dealerHand.map((c,i)=>(
          c && <div key={i} style={{...cardStyle(c), marginLeft:i===0?0:"-20px"}}>
            {!c.__isHole && <>
              <div>{c.value}</div>
              <div>{getSuitSymbol(c.suit)}</div>
              <div style={{transform:"rotate(180deg)"}}>{c.value}</div>
            </>}
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{
        marginBottom:"16px",padding:"12px 20px",borderRadius:"14px",
        background: statusColors[statusType], minHeight:"40px",
        fontSize:"18px", fontWeight:"bold", color:"white",
        boxShadow:"0 0 12px rgba(0,0,0,0.6)", transition:"background 0.5s ease"
      }}>
        {status}
      </div>

      {/* Player */}
      <h2 style={{fontSize:"28px", textShadow:"0 0 8px magenta", marginBottom:"8px"}}>PLAYER</h2>
      <div style={{
        display:"flex", minHeight:"160px", border:"3px solid #ffd700", borderRadius:"14px",
        padding:"12px", overflowX:"auto", justifyContent:"center",
        background:"radial-gradient(circle,#3a043b,#1a021d)", boxShadow:"0 0 12px #f0f inset"
      }}>
        {playerHand.map((c,i)=>(
          c && <div key={i} style={{...cardStyle(c), marginLeft:i===0?0:"-20px"}}>
            <div>{c.value}</div>
            <div>{getSuitSymbol(c.suit)}</div>
            <div style={{transform:"rotate(180deg)"}}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Score + Buttons */}
      <div style={{
        marginTop:"20px",
        display:"flex",
        justifyContent:"center",
        alignItems:"center",
        gap:"20px"
      }}>
        <div style={{
          fontWeight:"bold",
          fontSize:"22px",
          padding:"10px 20px",
          borderRadius:"12px",
          border:"2px solid #ffd700",
          background:"linear-gradient(145deg,#1c0d24,#320d4a)",
          boxShadow:"0 0 10px #ffd700,inset 0 0 10px #000"
        }}>
          SCORE: <span style={{color:"#ffd700",textShadow:"0 0 10px gold"}}>{getHandValue(playerHand)}</span>
        </div>
        <button onClick={playerHit} disabled={gameOver} style={buttonStyle}>✋ Hit</button>
        <button onClick={() => playerStand()} disabled={gameOver} style={buttonStyle}>🛑 Stand</button>
        <button 
          onClick={startNewRound} 
          disabled={!gameOver} 
          style={{
            ...buttonStyle,
            marginTop:"12px",
            opacity: !gameOver ? 0.5 : 1,
            cursor: !gameOver ? "not-allowed" : "pointer"
          }}
        >
          🔄 New Round
        </button>
      </div>

      {/* Popup */}
      {popup.show && (
        <div style={{
          position:"fixed",top:0,left:0,width:"100%",height:"100%",
          background:"rgba(0,0,0,0.7)", display:"flex", justifyContent:"center", alignItems:"center",
          zIndex:9999
        }}>
          <div style={{
            background:"#111",padding:"30px",borderRadius:"18px",
            border:"2px solid #ffd700",boxShadow:"0 0 20px #ffd700",
            textAlign:"center",color:"#fff",maxWidth:"420px",width:"90%"
          }}>
            <h2 style={{fontSize:"28px",marginBottom:"14px",textShadow:"0 0 10px #ff0"}}>{popup.message}</h2>
            <p style={{marginBottom:"20px"}}>{popup.detail}</p>
            <button style={buttonStyle} onClick={()=>setPopup({show:false,message:"",detail:""})}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Special effects overlay (framer-motion + AnimatePresence) */}
      <AnimatePresence>
        {specialEffect === "ngulinh" && (
          <motion.div
            key="ngulinh"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={overlayVariants}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            style={{
              position:"fixed", top:"40%", left:"22%", transform:"translateX(-50%,-50%)",
              zIndex: 9998, pointerEvents:"none", textAlign:"center",
              width: "min(92%, 900px)"
            }}
          >
            <div style={{
              fontSize: "78px",
              fontWeight: "900",
              color: "#00f0ff",
              textShadow: "0 0 30px rgba(0,208,255,0.8), 0 0 60px rgba(0,150,255,0.6)",
              whiteSpace:"nowrap"
            }}>
              🗡️🛡️ NGŨ LINH! 🛡️🗡️
            </div>
          </motion.div>
        )}

        {specialEffect === "nhaohoang" && (
          <motion.div
            key="nhaohoang"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={overlayVariants}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
            style={{
  position:"fixed", top:"40%", left:"22%", transform:"translateX(-50%,-50%)",
  transform:"translate(-50%, -50%)",
  zIndex: 9998, pointerEvents:"none", textAlign:"center",
  width:"100%"
}}
          >
            <div style={{
              fontSize: "78px",
              fontWeight: "900",
              color: "#ffd700",
              textShadow: "0 0 30px rgba(255,215,0,0.9), 0 0 60px rgba(255,80,0,0.6)",
              whiteSpace:"nowrap"
            }}>
              🐉 RỒNG PHƯỢNG - NHÀ HOÀNG! 🐲
            </div>
          </motion.div>
        )}

        {specialEffect === "denbai" && (
          <motion.div
            key="denbai"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={overlayVariants}
            transition={{ type: "spring", stiffness: 520, damping: 18 }}
            style={{
              position:"fixed", top:"40%", left:"22%", transform:"translateX(-50%,-50%)",
              zIndex: 9998, pointerEvents:"none", textAlign:"center",
              width: "min(92%, 900px)"
            }}
          >
            <div style={{
              fontSize: "68px",
              fontWeight: "900",
              color: "#ff5a5a",
              textShadow: "0 0 30px rgba(255,90,90,0.9), 0 0 60px rgba(200,20,20,0.6)",
              whiteSpace:"nowrap"
            }}>
              ☠️ ĐỀN BÀI! ☠️
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}