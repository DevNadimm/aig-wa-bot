"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SmartPhone01Icon, QrCodeIcon, Tick01Icon, AlertCircleIcon, Refresh01Icon, Plug01Icon } from "hugeicons-react";
import { QRCodeSVG } from 'qrcode.react';

export function WhatsAppConnection({ session }: { session: any }) {
  const [status, setStatus] = useState<string>("LOADING");
  const [qrCode, setQrCode] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Poll backend for real connection status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/whatsapp/status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status); // CONNECTING, CONNECTED, DISCONNECTED, GENERATING_QR, QR, DISCONNECTING
          setQrCode(data.qr);
          setPhone(data.phone);
        } else {
          setStatus("ERROR");
        }
      } catch (err) {
        setStatus("ERROR");
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setStatus("DISCONNECTING"); // Optimistically update UI
    try {
      await fetch('http://localhost:3001/api/whatsapp/logout', { method: 'POST' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatus("GENERATING_QR"); // Optimistically update UI
    try {
      await fetch('http://localhost:3001/api/whatsapp/connect', { method: 'POST' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const renderStatusBadge = () => {
    switch(status) {
      case "CONNECTED":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Tick01Icon className="w-4 h-4" /> Connected
          </div>
        );
      case "ERROR":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircleIcon className="w-4 h-4" /> Backend Offline
          </div>
        );
            case "CONNECTION_FAILED":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircleIcon className="w-4 h-4" /> Connection Failed
          </div>
        );
      case "BANNED":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircleIcon className="w-4 h-4" /> Account Banned
          </div>
        );
      case "CONFLICT":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <AlertCircleIcon className="w-4 h-4" /> Session Conflict (Logged in elsewhere)
          </div>
        );
      case "QR_TIMEOUT":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <AlertCircleIcon className="w-4 h-4" /> QR Code Expired
          </div>
        );
      case "BAD_SESSION":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircleIcon className="w-4 h-4" /> Bad Session Data
          </div>
        );
      case "DISCONNECTED":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircleIcon className="w-4 h-4" /> Disconnected
          </div>
        );
      case "DISCONNECTING":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Refresh01Icon className="w-4 h-4 animate-spin" /> Disconnecting...
          </div>
        );
      case "GENERATING_QR":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Refresh01Icon className="w-4 h-4 animate-spin" /> Generating QR...
          </div>
        );
      case "CONNECTING":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Refresh01Icon className="w-4 h-4 animate-spin" /> Connecting...
          </div>
        );
      case "QR":
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Refresh01Icon className="w-4 h-4 animate-spin" /> Waiting for Scan...
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-500/10 border border-zinc-500/20 text-zinc-400">
            <Refresh01Icon className="w-4 h-4 animate-spin" /> Initializing...
          </div>
        );
    }
  };

  return (
    <Card className="border-zinc-800 bg-[#0c0c0e]">
      <CardHeader className="border-b border-zinc-800/50">
        <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
          <SmartPhone01Icon className="w-5 h-5 text-indigo-400" /> WhatsApp Integration (Live)
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Connect your organization's WhatsApp number using the real Baileys backend.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-start gap-8">
          
          {/* Status Panel */}
          <div className="flex-1 space-y-6">
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-2">Connection Status</p>
              {renderStatusBadge()}
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-400 mb-2">Connected Number</p>
              <p className="text-lg font-mono text-zinc-200">
                {status === "CONNECTED" && phone ? `+${phone}` : "Not configured"}
              </p>
            </div>
          </div>

          {/* Action Panel */}
          <div className="w-full md:w-[320px] shrink-0 bg-[#09090b] border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center h-fit">
            {status === "CONNECTED" ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <SmartPhone01Icon className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-zinc-200 font-medium">WhatsApp is Active</h3>
                <p className="text-zinc-500 text-sm mb-4">Your AI bot is currently receiving and replying to messages.</p>
                <Button 
                  onClick={handleDisconnect} 
                  disabled={isDisconnecting || status === "DISCONNECTING"}
                  variant="outline" 
                  className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Plug01Icon className="w-4 h-4 mr-2" /> Disconnect Bot
                </Button>
              </div>
            ) : status === "DISCONNECTED" ? (
              <div className="text-center space-y-4 w-full">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertCircleIcon className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-zinc-200 font-medium">Disconnected</h3>
                <p className="text-zinc-500 text-sm mb-4">No WhatsApp number is linked.</p>
                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  <QrCodeIcon className="w-4 h-4 mr-2" /> Link New Number
                </Button>
              </div>
            ) : status === "QR" && qrCode ? (
              <div className="text-center space-y-4 w-full">
                <div className="bg-white p-4 rounded-xl mx-auto inline-block border-4 border-zinc-800 mb-2">
                  <QRCodeSVG value={qrCode} size={200} />
                </div>
                <h3 className="text-zinc-200 font-medium">Scan QR Code</h3>
                <p className="text-zinc-500 text-sm mb-2">Open WhatsApp on your phone (Linked Devices) and scan this code.</p>
              </div>
           ) : ["ERROR", "CONNECTION_FAILED", "BANNED", "CONFLICT", "BAD_SESSION", "QR_TIMEOUT"].includes(status) ? (
               <div className="text-center space-y-4 w-full">
                  <AlertCircleIcon className="w-10 h-10 text-red-500 mx-auto" />
                  <h3 className="text-zinc-200 font-medium">
                    {status === "CONNECTION_FAILED" ? "Connection Failed" :
                     status === "BANNED" ? "Account Banned" :
                     status === "CONFLICT" ? "Session Conflict" :
                     status === "QR_TIMEOUT" ? "QR Expired" :
                     status === "BAD_SESSION" ? "Corrupted Session" : "Backend Offline"}
                  </h3>
                  <p className="text-zinc-400 text-sm">
                    {status === "CONNECTION_FAILED" ? "Could not connect to WhatsApp servers." :
                     status === "BANNED" ? "This number has been banned by WhatsApp." :
                     status === "CONFLICT" ? "WhatsApp is opened in another browser/location." :
                     status === "QR_TIMEOUT" ? "The QR code has timed out. Please try again." :
                     status === "BAD_SESSION" ? "Session data is corrupted. Please relink." : "Cannot reach backend server at port 3000."}
                  </p>
                  {(status === "QR_TIMEOUT" || status === "BAD_SESSION" || status === "CONFLICT") && (
                    <Button 
                      onClick={handleConnect} 
                      disabled={isConnecting}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white mt-2"
                    >
                      <Refresh01Icon className="w-4 h-4 mr-2" /> Try Again
                    </Button>
                  )}
               </div>
            ) : (
              <div className="text-center space-y-4 w-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-2 animate-pulse shadow-inner">
                  <QrCodeIcon className="w-8 h-8 text-zinc-700" />
                </div>
                <h3 className="text-zinc-200 font-medium">
                  {status === "GENERATING_QR" ? "Generating QR Code" : 
                   status === "CONNECTING" ? "Connecting to WhatsApp" : 
                   status === "DISCONNECTING" ? "Logging out..." : "Getting Ready"}
                </h3>
                <p className="text-zinc-500 text-sm">Please wait a moment...</p>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
