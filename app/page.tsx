'use client';
import {useEffect,useState} from "react";
import App from "../src/App.tsx";
export default function HomePage(){const[ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);return ready?<App/>:<main className="main-content" style={{paddingTop:64}}><h1>FundScope</h1><p>Opening your research workspace…</p></main>;}
