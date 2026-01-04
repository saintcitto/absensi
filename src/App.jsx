import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Save, Trash2, User, Clock, Calendar, CheckCircle, AlertCircle, Lock, LogOut, Download, FileText } from 'lucide-react';

export default function App() {
  // --- STATE MANAGEMENT ---
  const [viewMode, setViewMode] = useState('user'); // 'user' or 'admin'
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

  // 1. Update Jam Real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Load data dari LocalStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('attendanceLogs_v2');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  }, []);

  // 3. Cleanup kamera
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // --- FUNCTIONS UTAMA ---

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
      hour12: false
    }).format(dateObj);
  };

  // --- KAMERA LOGIC ---
  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraOpen(true);
          videoRef.current.play();
        };
      }
    } catch (err) {
      console.error("Camera Error:", err);
      // Fallback
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
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
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

  // --- SUBMIT LOGIC ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !capturedImage) return;

    setLoading(true);
    const now = new Date();
    
    const newLog = {
      id: Date.now(),
      name: name,
      fullDate: getFormattedDate(now),
      rawDate: now.toISOString().split('T')[0], // Untuk sorting/filtering nanti
      time: getFormattedTime(now),
      photo: capturedImage,
      type: 'Masuk'
    };

    setTimeout(() => {
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      localStorage.setItem('attendanceLogs_v2', JSON.stringify(updatedLogs));
      setName('');
      setCapturedImage(null);
      setLoading(false);
    }, 500);
  };

  const deleteLog = (id) => {
    if (window.confirm("Hapus data ini permanen?")) {
      const filtered = logs.filter(log => log.id !== id);
      setLogs(filtered);
      localStorage.setItem('attendanceLogs_v2', JSON.stringify(filtered));
    }
  };

  // --- ADMIN FUNCTIONS ---
  const handleAdminLogin = () => {
    const password = prompt("Masukkan Password Admin:");
    // Password diupdate sesuai request
    if (password === "soniacafegacor") {
      setViewMode('admin');
    } else if (password !== null) {
      alert("Password salah!");
    }
  };

  const downloadCSV = () => {
    const headers = ["ID", "Nama", "Tanggal", "Jam", "Status"];
    const csvContent = [
      headers.join(","),
      ...logs.map(log => `${log.id},"${log.name}","${log.fullDate}","${log.time}","${log.type}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `laporan_absensi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-12">
      
      {/* HEADER GLOBAL */}
      <header className={`${viewMode === 'admin' ? 'bg-slate-800' : 'bg-blue-700'} text-white shadow-lg sticky top-0 z-40 transition-colors duration-300`}>
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {viewMode === 'admin' ? <FileText className="text-yellow-400" /> : <CheckCircle className="text-green-400" />}
              {viewMode === 'admin' ? 'Admin Panel' : 'Absensi Sonia Cafe'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {viewMode === 'user' ? (
              <div className="text-right mr-2">
                <div className="text-xl font-mono font-bold leading-none">{getFormattedTime(currentTime)}</div>
                <div className="text-[10px] text-blue-200 mt-1">{getFormattedDate(currentTime)}</div>
              </div>
            ) : null}
            
            <button 
              onClick={viewMode === 'user' ? handleAdminLogin : () => setViewMode('user')}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title={viewMode === 'user' ? "Login Admin" : "Keluar Admin"}
            >
              {viewMode === 'user' ? <Lock size={18} /> : <LogOut size={18} className="text-red-300" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        
        {/* --- VIEW: USER MODE --- */}
        {viewMode === 'user' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <div className="bg-blue-50 px-5 py-3 border-b border-blue-100 flex items-center gap-2">
                <User size={18} className="text-blue-600" />
                <h2 className="font-semibold text-blue-800">Input Data Kehadiran</h2>
              </div>
              <div className="p-5">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Nama Pegawai / Siswa</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ketik nama lengkap..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">Foto Selfie (Wajib)</label>
                    <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-300">
                      {cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-center p-4 z-20">
                          <AlertCircle className="text-red-500 mb-2" size={32} />
                          <p className="text-sm text-red-600 mb-3">{cameraError}</p>
                          <button type="button" onClick={startCamera} className="text-xs bg-white border border-red-200 px-3 py-1 rounded shadow-sm">Coba Lagi</button>
                        </div>
                      )}
                      {!isCameraOpen && !capturedImage && !cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10">
                          <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                            <Camera className="text-blue-500" size={32} />
                          </div>
                          <p className="text-slate-500 text-sm mb-4">Kamera belum aktif</p>
                          <button type="button" onClick={startCamera} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium text-sm transition-colors shadow-md flex items-center gap-2">Buka Kamera Depan</button>
                        </div>
                      )}
                      <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${isCameraOpen && !capturedImage ? 'block' : 'hidden'}`} />
                      {capturedImage && <img src={capturedImage} alt="Hasil Selfie" className="absolute inset-0 w-full h-full object-cover z-20" />}
                      <canvas ref={canvasRef} className="hidden" />
                      {isCameraOpen && !capturedImage && (
                        <div className="absolute bottom-5 left-0 right-0 flex justify-center z-20">
                          <button type="button" onClick={takePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-slate-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"><div className="w-14 h-14 rounded-full bg-red-500 border-2 border-white"></div></button>
                        </div>
                      )}
                    </div>
                    {capturedImage && (
                      <div className="mt-2 flex justify-end">
                        <button type="button" onClick={retakePhoto} className="text-sm font-medium text-blue-600 flex items-center gap-1 hover:underline"><RefreshCw size={14} /> Ambil Ulang Foto</button>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={loading || !capturedImage || !name} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2 ${loading || !capturedImage || !name ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-[0.98]'}`}>
                    {loading ? 'Menyimpan...' : <><Save size={20} /> Absen Sekarang</>}
                  </button>
                </form>
              </div>
            </div>

            {/* Riwayat Singkat (User View) */}
            <div className="pb-10">
              <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 px-1">
                <Calendar size={20} className="text-blue-600" /> Riwayat Hari Ini
              </h2>
              {logs.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-400 text-sm">Belum ada data.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 3).map((log) => (
                    <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-100 flex gap-3 items-center opacity-80">
                      <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-200"><img src={log.photo} className="w-full h-full object-cover" /></div>
                      <div>
                        <h3 className="font-bold text-slate-700 text-sm truncate">{log.name}</h3>
                        <div className="text-xs text-slate-500">{log.time} WIB</div>
                      </div>
                    </div>
                  ))}
                  {logs.length > 3 && <p className="text-center text-xs text-slate-400 mt-2">...dan {logs.length - 3} lainnya (Login admin untuk lihat semua)</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- VIEW: ADMIN MODE --- */}
        {viewMode === 'admin' && (
          <div className="space-y-6 pb-20">
            {/* Admin Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Absensi</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{logs.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-2xl shadow-sm border border-green-100 flex flex-col justify-center items-center cursor-pointer hover:bg-green-100 transition-colors" onClick={downloadCSV}>
                <Download className="text-green-600 mb-1" size={24} />
                <p className="text-xs font-bold text-green-700">Download CSV</p>
              </div>
            </div>

            {/* Admin Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Database Kehadiran</h3>
                <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">Terbaru diatas</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Foto</th>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-slate-400">Database kosong</td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 cursor-pointer hover:scale-150 transition-transform origin-left">
                              <img src={log.photo} alt="user" className="w-full h-full object-cover" />
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {log.name}
                            <div className="text-[10px] text-slate-400 font-normal">{log.fullDate}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{log.time}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => deleteLog(log.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-slate-400">
                Catatan: Data ini tersimpan di browser ini. Jika berpindah perangkat, data tidak akan muncul.
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
