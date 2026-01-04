import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Save, Trash2, User, Clock, Calendar, CheckCircle, AlertCircle, MapPin } from 'lucide-react';

export default function App() {
  // --- STATE MANAGEMENT ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [name, setName] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // --- EFFECTS ---

  // 1. Update Jam Real-time (Setiap detik)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Load data dari LocalStorage saat start
  useEffect(() => {
    const savedLogs = localStorage.getItem('attendanceLogs_v2');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  }, []);

  // 3. Cleanup kamera saat tutup
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // --- FUNCTIONS ---

  // Format Waktu Lengkap (Indonesia)
  const getFormattedDate = (dateObj) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  };

  const getFormattedTime = (dateObj) => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false // Format 24 jam
    }).format(dateObj);
  };

  // Mulai Kamera (Langsung Kamera Depan)
  const startCamera = async () => {
    setCameraError(null);
    try {
      // Constraints khusus untuk kamera depan
      const constraints = {
        video: {
          facingMode: 'user', // 'user' = Kamera Depan, 'environment' = Kamera Belakang
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Tunggu metadata load agar tidak blank
        videoRef.current.onloadedmetadata = () => {
          setIsCameraOpen(true);
          videoRef.current.play();
        };
      }
    } catch (err) {
      console.error("Camera Error:", err);
      // Fallback jika kamera depan tidak terdeteksi (misal di laptop lama)
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          setIsCameraOpen(true);
        }
      } catch (fallbackErr) {
        setCameraError("Gagal akses kamera. Pastikan izin browser aktif.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Sesuaikan ukuran canvas dengan video asli
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      
      // FLIP HORIZONTAL (Efek Cermin untuk Selfie)
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imgUrl = canvas.toDataURL('image/png');
      setCapturedImage(imgUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name.trim() || !capturedImage) return;

    setLoading(true);

    const now = new Date();
    
    const newLog = {
      id: Date.now(),
      name: name,
      fullDate: getFormattedDate(now), // "Senin, 22 Desember 2025"
      time: getFormattedTime(now),     // "14:30:05"
      photo: capturedImage,
      type: 'Masuk' // Bisa dikembangkan jadi Masuk/Pulang
    };

    setTimeout(() => {
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      localStorage.setItem('attendanceLogs_v2', JSON.stringify(updatedLogs));
      
      // Reset
      setName('');
      setCapturedImage(null);
      setLoading(false);
    }, 500);
  };

  const deleteLog = (id) => {
    if (window.confirm("Hapus data ini?")) {
      const filtered = logs.filter(log => log.id !== id);
      setLogs(filtered);
      localStorage.setItem('attendanceLogs_v2', JSON.stringify(filtered));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-12">
      
      {/* Header Real-time */}
      <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="text-green-400" size={24} />
              AbsensiPro
            </h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold leading-none tracking-tight">
              {getFormattedTime(currentTime)}
            </div>
            <div className="text-xs text-blue-200 mt-1 font-medium">
              {getFormattedDate(currentTime)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6 space-y-6">
        
        {/* --- FORM ABSENSI --- */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-blue-50 px-5 py-3 border-b border-blue-100 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            <h2 className="font-semibold text-blue-800">Input Data Kehadiran</h2>
          </div>
          
          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Input Nama */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Nama:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ketik nama lengkap..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  required
                />
              </div>

              {/* Kamera Section */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Foto Selfie (Wajib)</label>
                
                <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-300">
                  
                  {/* Pesan Error */}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-center p-4 z-20">
                      <AlertCircle className="text-red-500 mb-2" size={32} />
                      <p className="text-sm text-red-600 mb-3">{cameraError}</p>
                      <button type="button" onClick={startCamera} className="text-xs bg-white border border-red-200 px-3 py-1 rounded shadow-sm">Coba Lagi</button>
                    </div>
                  )}

                  {/* Placeholder saat kamera mati & belum ada foto */}
                  {!isCameraOpen && !capturedImage && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10">
                      <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                        <Camera className="text-blue-500" size={32} />
                      </div>
                      <p className="text-slate-500 text-sm mb-4">Kamera belum aktif</p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium text-sm transition-colors shadow-md flex items-center gap-2"
                      >
                        Buka Kamera Depan
                      </button>
                    </div>
                  )}

                  {/* Video Live Stream */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${isCameraOpen && !capturedImage ? 'block' : 'hidden'}`}
                  />

                  {/* Hasil Foto */}
                  {capturedImage && (
                    <img 
                      src={capturedImage} 
                      alt="Hasil Selfie" 
                      className="absolute inset-0 w-full h-full object-cover z-20" 
                    />
                  )}

                  {/* Canvas Tersembunyi */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Tombol Shutter (Saat Live) */}
                  {isCameraOpen && !capturedImage && (
                    <div className="absolute bottom-5 left-0 right-0 flex justify-center z-20">
                      <button
                        type="button"
                        onClick={takePhoto}
                        className="w-16 h-16 rounded-full bg-white border-4 border-slate-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
                      >
                        <div className="w-14 h-14 rounded-full bg-red-500 border-2 border-white"></div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Tombol Ulang */}
                {capturedImage && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="text-sm font-medium text-blue-600 flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw size={14} /> Ambil Ulang Foto
                    </button>
                  </div>
                )}
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                disabled={loading || !capturedImage || !name}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2
                  ${loading || !capturedImage || !name 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 active:scale-[0.98]'}`}
              >
                {loading ? 'Menyimpan...' : (
                  <>
                    <Save size={20} />
                    Absen Sekarang
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* --- RIWAYAT LOG --- */}
        <div className="pb-10">
          <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 px-1">
            <Calendar size={20} className="text-blue-600" />
            Riwayat Absensi
          </h2>

          {logs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-400 text-sm">Belum ada data absensi hari ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 relative overflow-hidden group">
                  
                  {/* Bar Warna Status */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>

                  <div className="flex gap-4 items-start w-full">
                    {/* Foto Thumbnail */}
                    <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-200 border border-slate-100 shadow-sm">
                      <img src={log.photo} alt={log.name} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Detail Data */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg truncate">{log.name}</h3>
                          <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
                            BERHASIL
                          </span>
                        </div>
                        <button 
                          onClick={() => deleteLog(log.id)}
                          className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-1 text-sm text-slate-500 mt-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-blue-500" />
                          <span className="font-medium text-slate-700">{log.fullDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-orange-500" />
                          <span className="font-mono">{log.time} WIB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}