import { io } from "socket.io-client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LogOut, PlusCircle, Trash2, User as UserIcon, Image as ImageIcon,
  Loader2, Lock, Mail, RefreshCcw, AlertCircle, Heart, MessageCircle,
  ShieldCheck, ExternalLink, Settings, Globe, Camera, Home, UserPlus,
  ArrowRight, X, Layout, Sparkles, Wand2, Zap, MessageSquareQuote
} from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || "https://instagram-backend-hswx.onrender.com";
const DEFAULT_API_URL = "https://instagram-backend-hswx.onrender.com";;


/**
 * GEMINI API UTILS
 */
const retryWithBackoff = async (fn, retries = 5, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;

        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressed = canvas.toDataURL("image/jpeg", 0.6);
        resolve(compressed);
      };
    };
  });
};
const callGemini = async (prompt, image = null) => {
  try {
    const compressed = image ? await compressImage(image) : null;
    const res = await fetch(`${DEFAULT_API_URL}/gemini`, {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}`
},
      
      body: JSON.stringify({
        prompt,
        

image: compressed ? compressed.split(",")[1] : null
      }),
    });

    let data;
try {
  data = await res.json();
} catch {
  throw new Error("Server returned invalid response");
}

    if (!res.ok) {
      console.log("Gemini backend error:", data);
      throw new Error("Gemini failed");
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  } catch (err) {
    console.log("Gemini fetch error:", err);
    throw err;
  }
};



/**
 * UI HELPER COMPONENTS
 */

const GradientButton = ({ onClick, children, loading, color = "blue", disabled, type = "button" }) => {
  const colors = {
    blue: "from-blue-600 to-indigo-600 shadow-blue-200 hover:shadow-blue-300",
    purple: "from-purple-600 to-pink-600 shadow-purple-200 hover:shadow-purple-300",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-100 hover:shadow-emerald-200",
    red: "from-red-500 to-rose-600 shadow-red-100 shadow-red-200",
    magic: "from-violet-500 via-fuchsia-500 to-orange-500 shadow-fuchsia-200 hover:shadow-fuchsia-300"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`w-full py-4 bg-gradient-to-r ${colors[color]} text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2`}
    >
      {loading ? <Loader2 className="animate-spin" size={20} /> : children}
    </button>
  );
};

const InputField = ({ icon: Icon, type, placeholder, value, onChange, required = true }) => (
  <div className="relative group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
      <Icon size={18} />
    </div>
    <input
      type={type}
      required={required}
      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-slate-700"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

// --- SUB-VIEWS ---

const AuthView = ({ view, setView, authData, setAuthData, handleAuth, loading, error, API_URL, setShowConfig }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
      
      <button onClick={() => setShowConfig(true)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-blue-500 hover:bg-slate-50 rounded-full transition-all">
        <Settings size={20} />
      </button>

      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-sm">
          <Sparkles size={32} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          {view === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-500 font-medium mt-2">
          {view === 'login' ? 'Login to MiniGram' : 'Join our creative community'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
            <AlertCircle size={14} /> Backend Issue
          </div>
          <p className="text-xs text-red-500 font-medium">{error}</p>
          <a href={API_URL} target="_blank" rel="noreferrer" className="text-[10px] bg-red-600 text-white font-bold py-2 rounded-xl text-center shadow-lg">1. Backend not connected</a>
        </div>
      )}

      <form className="space-y-4" onSubmit={(e) => handleAuth(e, view)}>
        {view === 'register' && (
          <InputField icon={UserIcon} type="text" placeholder="Full Name" value={authData.name} onChange={e => setAuthData({...authData, name: e.target.value})} />
        )}
        <InputField icon={Mail} type="email" placeholder="Email Address" value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})} />
        <InputField icon={Lock} type="password" placeholder="Password" value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} />
        
        <GradientButton type="submit" loading={loading} color={view === 'login' ? 'blue' : 'emerald'}>
          {view === 'login' ? 'Sign In' : 'Join MiniGram'}
        </GradientButton>
      </form>

      <div className="mt-8 pt-8 border-t border-slate-50 text-center">
        <p className="text-sm font-bold text-slate-400">
          {view === 'login' ? "Don't have an account?" : "Already a member?"}{' '}
          <button 
            onClick={() => { setView(view === 'login' ? 'register' : 'login'); }}
            className="text-blue-600 hover:underline"
          >
            {view === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  </div>
);
const Dashboard = ({ user, setUser, token, profileUser, setProfileUser, handleProfileUpdate, view, setView, posts, fetchPosts, handleCreatePost, handleDeletePost, handleLogout, postData, setPostData, loading, API_URL, handleLike, likedPostId, commentText, setCommentText, handleComment, activePostId, setActivePostId, commentInputs, setCommentInputs, showSuggestions, setShowSuggestions, suggestedUsers, setSuggestedUsers}) => {
  console.log("PROFILE USER:", profileUser);
  console.log("POSTS:", posts);
  const openProfile = (userData) => {
  if (!userData) return;

  setProfileUser(userData);
  setView("profile");
};
  const [aiLoading, setAiLoading] = useState(false);
  const [pullY, setPullY] = useState(0);
const [isPulling, setIsPulling] = useState(false);
const [isRefreshing, setIsRefreshing] = useState(false);
const handleTouchMove = (e) => {
  if (!isPulling) return;

  const currentY = e.touches[0].clientY;
  const diff = currentY - pullY;

  if (diff > 0 && diff < 120) {
    document.documentElement.style.transform = `translateY(${diff}px)`;
  }
};

const handleTouchEnd = async () => {
  if (!isPulling) return;

  setIsPulling(false);
  document.documentElement.style.transform = "translateY(0px)";

  setIsRefreshing(true);
  await fetchPosts();
  setIsRefreshing(false);
};
  const [activeAiCommentId, setActiveAiCommentId] = useState(null);


const handleTouchStart = (e) => {
  if (window.scrollY === 0) {
    setIsPulling(true);
    setPullY(e.touches[0].clientY);
  }
};
  const handleMagicCaption = async () => {
  if (!postData.image) return;

  setAiLoading(true);

  try {
    const suggestion = await Promise.race([
      callGemini(
        "Generate a cool, short social media caption for this image. Use emojis.",
        postData.image
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 20000)
      )
    ]);

    setPostData(prev => ({
      ...prev,
      caption: suggestion.trim().replace(/^"|"$/g, "")
    }));

  } catch (err) {
    console.log("Gemini failed:", err);
    alert("AI is slow or not responding ❌");
  } finally {
    setAiLoading(false);
  }
};

  const handleEnhanceCaption = async () => {
    if (!postData.caption) return;
    setAiLoading(true);
    try {
      const suggestion = await Promise.race([
  callGemini(`Make this social media caption more engaging and exciting: "${postData.caption}"`),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), 20000)
  )
]);
      setPostData(prev => ({ ...prev, caption: suggestion.trim().replace(/^"|"$/g, '') }));
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiComment = async (postId, postCaption) => {
    setActiveAiCommentId(postId);
    try {
      const suggestion = await callGemini(`Suggest a friendly, short, and relevant comment for this social media post caption: "${postCaption}"`);
      // Since we don't have a comment API in the provided snippet, we'll just show it in a custom alert/toast
      setCommentInputs(prev => ({
  ...prev,
  [postId]: suggestion.trim()
}));
    } catch (err) {
      console.error(err);
    } finally {
      setActiveAiCommentId(null);
    }
  };

  return (
    <div
  className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20"
  style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
>
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer active:scale-95 transition-transform" onClick={() => { setView('feed'); fetchPosts(); }}>
            MiniGram
          </h1>
          <div className="flex items-center gap-4">
            <button
  onClick={() => setShowSuggestions(true)}
  className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all"
>
  <UserPlus size={20} />
</button>
            <button onClick={() => setView('create')} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
              <PlusCircle size={22} />
            </button>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <div
  onClick={() => {
    setProfileUser(user);
    setView('profile');
  }}
  className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-black cursor-pointer"
>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span
  onClick={() => {
    setProfileUser(user);   // set current user
    setView('profile');     // open profile page
  }}
  className="text-xs font-bold text-slate-700 hidden sm:block cursor-pointer hover:text-blue-600"
>
  {user?.name}
</span>
            </div>
            <button onClick={handleLogout} className="text-slate-300 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main
  className="max-w-2xl mx-auto py-8 px-4"
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
>
        {isRefreshing && (
  <div className="text-center mb-4">
    <span className="text-blue-500 font-bold animate-pulse">
      Refreshing feed...
    </span>
  </div>
)}
        
        {view === 'profile' ? (
  <div className="bg-white p-6 rounded-2xl shadow">

    {/* USER INFO */}
    <div className="flex items-center gap-4 mb-6">
      <div className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
        {profileUser?.name?.[0]?.toUpperCase()}
      </div>

      <div>
  <div className="flex flex-col gap-1">
  <h2 className="font-bold text-lg">{profileUser?.name}</h2>

  <p className="text-gray-400 text-sm">
    {profileUser?.email}
  </p>

  <div className="flex gap-4 text-sm mt-1">
    <span>
      <b>{profileUser?.followers?.length || 0}</b> followers
    </span>

    <span>
      <b>{profileUser?.following?.length || 0}</b> following
    </span>
  </div>
</div>
        <button
  onClick={() => handleProfileUpdate(profileUser.name)}
  className="mt-2 bg-blue-500 text-white px-3 py-1 rounded"
>
  Update Profile
</button>
      </div>
    </div>

    {user?._id !== profileUser?._id && (
  <button
    onClick={async () => {

  // 🔥 instant UI update
  setUser(prev => {
  const isFollowing = prev.following.some(
    f => (f._id || f) === profileUser._id
  );

  return {
    ...prev,
    following: isFollowing
      ? prev.following.filter(f => (f._id || f) !== profileUser._id)
      : [...prev.following, profileUser._id]
  };
});

  try {
    const res = await fetch(`${API_URL}/follow/${profileUser._id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    setUser(data.currentUser);
    fetchSuggestedUsers();
    setProfileUser(data.targetUser);

  } catch (err) {
    console.log(err);
  }
}}
    className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
  >
    {user?.following?.some(f => (f._id || f) === profileUser._id)
      ? "Unfollow"
      : "Follow"}
  </button>
)}
    {/* POSTS */}
    <h3 className="font-bold mb-3">Posts</h3>

    <div className="grid grid-cols-2 gap-3">
      {posts
        .filter(p =>
  p.userId &&
  profileUser &&
  p.userId?._id?.toString() === profileUser?._id?.toString()
)
        .map(post => (
          
          
          <div key={post._id} className="relative group">

  {/* USER HEADER */}
  <div className="flex justify-between items-center mb-2">
    <span className="font-bold">{post.userId?.name}</span>

    {user?._id === profileUser?._id && (
      <button
        onClick={() => handleDeletePost(post._id)}
        className="text-red-500 text-sm"
      >
        Delete
      </button>
    )}
  </div>

  {/* IMAGE */}
  <div
    onDoubleClick={() => handleLike(post._id)}
    className="cursor-pointer"
  >
    <img
  src={post.image}
  className="w-full h-60 object-cover rounded"
  alt="Post"
/>
  </div>

  {/* LIKE + COMMENT */}
  <div className="flex items-center gap-4 mt-3">

    

    {/* ❤️ LIKE */}
    <span
      onClick={() => handleLike(post._id)}
      className={`cursor-pointer text-xl ${
        post.likes?.some(id => id.toString() === user?._id?.toString())
          ? "text-red-500"
          : "text-gray-600"
      }`}
    >
      ❤️
    </span>

    {/* 💬 COMMENT */}
    <span
      onClick={() => setActivePostId(post._id)}
      className="cursor-pointer"
    >
      💬
    </span>

  </div>

  {/* LIKE COUNT */}
  <p className="text-sm font-bold mt-1">
    {post.likes?.length || 0} likes
  </p>

  {/* CAPTION */}
  <p className="text-sm">
    <b>{post.userId?.name}</b> {post.caption}
  </p>

  {/* COMMENTS PANEL */}
  {activePostId === post._id && (
    <div className="mt-2 border p-2 rounded">

      <div className="flex justify-between">
        <span className="font-bold text-sm">Comments</span>
        <button onClick={() => setActivePostId(null)}>Back</button>
      </div>

      {post.comments?.map((c, i) => (
  <p key={i}>
    <b>{c.userId?.name || "User"}:</b> {c.text}
  </p>
))}

      <div className="flex gap-2 mt-2">
        <input
          value={commentInputs[post._id] || ""}
          onChange={(e) =>
            setCommentInputs(prev => ({
              ...prev,
              [post._id]: e.target.value
            }))
          }
          placeholder="Add comment"
          className="border px-2 py-1 w-full"
        />

        <button
          onClick={() => {
            handleComment(post._id, commentInputs[post._id]);
            setCommentInputs(prev => ({
              ...prev,
              [post._id]: ""
            }));
          }}
        >
          Post
        </button>
      </div>

    </div>
  )}

</div>
))}
    </div>

    {/* BACK BUTTON */}
    <button
      onClick={() => setView('feed')}
      className="mt-4 text-blue-500"
    >
      ← Back
    </button>

  </div>
) : view === 'create' ? (
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <Camera className="text-blue-600" /> Share a Moment
              </h2>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleEnhanceCaption}
                  disabled={aiLoading || !postData.caption}
                  className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-600 rounded-full text-xs font-bold hover:bg-violet-100 transition-all disabled:opacity-30"
                  title="Enhance with AI"
                >
                  {aiLoading ? <Loader2 className="animate-spin" size={14}/> : <Zap size={14}/>} ✨ Rewrite
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreatePost} className="space-y-6">
              <textarea
                placeholder="What's on your mind?"
                className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] h-40 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 resize-none transition-all font-medium"
                value={postData.caption}
                onChange={(e) => setPostData({ ...postData, caption: e.target.value })}
              />
              
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-72 border-3 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all overflow-hidden relative group">
                  {postData.image ? (
                    <>
                      <img src={URL.createObjectURL(postData.image)} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button 
                          type="button"
                          onClick={(e) => { e.preventDefault(); handleMagicCaption(); }}
                          disabled={aiLoading}
                          className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg text-violet-600 font-bold text-xs flex items-center gap-2 hover:bg-white transition-all border border-violet-100"
                        >
                          <Sparkles size={14} className={aiLoading ? "animate-spin" : ""}/> ✨ Generate Caption
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <ImageIcon size={32} />
                      </div>
                      <span className="text-sm font-black uppercase tracking-tighter">Choose Your Photo</span>
                      <span className="text-xs text-slate-400 mt-1 font-bold">JPG, PNG or GIF</span>
                    </div>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setPostData({ ...postData, image: e.target.files[0] })} />
                </label>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setView('feed')} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">Discard</button>
                <GradientButton type="submit" loading={loading} color="blue" disabled={!postData.image}>Post Now</GradientButton>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-10">
            {posts.length === 0 && !loading && (
  <div className="text-center py-20">
    <p className="text-gray-500 text-lg font-semibold">
      Follow users to see posts 👥
    </p>

    <p className="text-gray-400 text-sm mt-2">
      Your feed will show posts only from people you follow
    </p>
  </div>
)}

            {posts
  .filter(post => {
    if (!user) return false;

    const isFollowing = user.following?.some(
      f => (f._id || f) === post.userId?._id
    );

    const isOwnPost = post.userId?._id === user._id;

    return isFollowing || isOwnPost;
  })
  .map((post) => {
              const isLikedAnim = likedPostId === post._id;
              return (
              <article key={post._id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-700 hover:shadow-lg transition-shadow">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 p-[2px]">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-black text-indigo-600 text-sm">
                        {post.userId?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{post.userId?.name || 'Anonymous'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.userId?._id !== user?._id && (
  <button
    onClick={async () => {

      let isUnfollow = false;

      // 🔥 instant UI update
      setUser(prev => {
        const isFollowing = prev.following.some(
          f => (f._id || f) === post.userId._id
        );

        isUnfollow = isFollowing;

        return {
          ...prev,
          following: isFollowing
            ? prev.following.filter(id => id !== post.userId._id)
            : [...prev.following, post.userId._id]
        };
      });

      // ✅ REMOVE POSTS IF UNFOLLOW
      

      try {
        const res = await fetch(`${API_URL}/follow/${post.userId._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();

        setUser(data.currentUser);

    
        fetchSuggestedUsers();

      } catch (err) {
        console.log(err);
      }
    }}
    className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-bold hover:bg-blue-600 transition"
  >
    {user?.following?.some(f => (f._id || f) === post.userId._id)
      ? "Unfollow"
      : "Follow"}
  </button>
)}
                    {post.userId?._id === user?._id && (
                      <button onClick={() => handleDeletePost(post._id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

               <div
  className="w-full bg-black flex items-center justify-center cursor-pointer relative group overflow-hidden rounded-xl"
  style={{ maxHeight: "500px" }}
>
  <img
    src={post.image}
    className="w-full max-h-[500px] object-contain"
    alt="Post"
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "https://dummyimage.com/600x600/cccccc/000000";
    }}
  />

  {isLikedAnim && (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
      <span className="text-6xl text-rose-500 scale-150 transition-all duration-300">❤️</span>
    </div>
  )}
</div>
                
                <div className="p-6">
                  <div className="flex items-center gap-6 mb-4">
                    <Heart
  onClick={() => handleLike(post._id)}
  className={`cursor-pointer active:scale-125 ${
    post.likes?.some(id => id.toString() === user?._id?.toString())
      ? "text-rose-500 fill-rose-500"
      : "text-slate-800 hover:text-rose-500"
  }`}
/>
                    <p className="text-sm font-bold mt-2">
                      {post.likes?.length || 0} likes
                    </p>
                    <MessageCircle
  onClick={() => setActivePostId(post._id)}
  className="text-slate-800 hover:text-blue-500 cursor-pointer active:scale-125"
/>
                  </div>
                  {/* USER + CAPTION */}
<div className="flex gap-3 items-baseline">
  <span
 
  onClick={() => openProfile(post.userId)}
  className="font-bold text-sm text-slate-900 cursor-pointer"
>
  {post.userId?.name}
</span>

  <p className="text-sm text-slate-700">
    {post.caption}
  </p>
</div>

{/* COMMENTS LIST */}
{/* ✅ COMMENT PANEL (ONLY WHEN CLICKED) */}
{activePostId === post._id && (
  <div className="mt-3 p-3 border rounded-xl bg-gray-50">

    {/* HEADER */}
    <div className="flex justify-between mb-2">
      <span className="font-bold text-sm">Comments</span>

      <button
        onClick={() => setActivePostId(null)}
        className="text-red-500 text-sm"
      >
        Back
      </button>
    </div>

    {/* COMMENTS LIST */}
    <div className="max-h-40 overflow-y-auto space-y-1">
      {post.comments?.map((c, i) => (
        <p key={i} className="text-sm text-gray-700">
          <span className="font-bold">{c.userId?.name || "User"}:</span> {c.text}
        </p>
      ))}
    </div>

    {/* INPUT */}
    <div className="flex gap-2 mt-2">
      <input
        value={commentInputs[post._id] || ""}
        onChange={(e) =>
          setCommentInputs(prev => ({
  ...prev,
  [post._id]: e.target.value
}))
        }
onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (!commentInputs[post._id]?.trim()) return;

    handleComment(post._id, commentInputs[post._id]);
    

    setCommentInputs(prev => ({
      ...prev,
      [post._id]: ""
    }));
  }
}
        }
        placeholder="Add a comment..."
        className="border px-2 py-1 rounded w-full"
      />

      <button
        onClick={() => {
          if (!commentInputs[post._id]?.trim()) return;
          handleComment(post._id, commentInputs[post._id]);
          setCommentInputs(prev => ({
  ...prev,
  [post._id]: ""
}));
        }}
        className="text-blue-500 font-bold"
      >
        Post
      </button>
    </div>

  </div>
)}
                  
                </div>
              </article>
             );
})}
          </div>
        )}
      </main>

      {/* 🔥 SUGGESTED USERS PANEL */}
{showSuggestions && (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

    <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl">

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">Discover Users</h2>
        <button onClick={() => setShowSuggestions(false)}>
          <X />
        </button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">

        {suggestedUsers.length === 0 && (
          <p className="text-gray-400 text-center">No users to follow</p>
        )}

        {suggestedUsers.map(u => (
          <div key={u._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">

            <span
  onClick={() => openProfile(u)}
  className="font-semibold cursor-pointer hover:text-blue-600"
>
  {u.name}
</span>

            <button
              onClick={async () => {
                setSuggestedUsers(prev => prev.filter(x => x._id !== u._id));

                try {
                  const res = await fetch(`${API_URL}/follow/${u._id}`, {
                    method: "PUT",
                    headers: {
                      Authorization: `Bearer ${token}`
                    }
                  });

                  const data = await res.json();
                  setUser(data.currentUser);
                  fetchSuggestedUsers();

                } catch (err) {
                  console.log(err);
                }
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm"
            >
              Follow
            </button>

          </div>
        ))}

      </div>
    </div>
  </div>
)}

<footer className="py-10 text-center opacity-30 select-none flex items-center justify-center gap-4">
  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
</footer>
      
      <footer className="py-10 text-center opacity-30 select-none flex items-center justify-center gap-4">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </footer>
    </div>
  );
};

/**
 * MAIN APP COMPONENT
 */

export default function App() {
  const socketRef = useRef(null);
  const [profileUser, setProfileUser] = useState(null);
  const [activePostId, setActivePostId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [view, setView] = useState('login'); 
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [posts, setPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [likedPostId, setLikedPostId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Form states
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
  const [postData, setPostData] = useState({ caption: '', image: null });

  useEffect(() => {
  if (!token) return; // ✅ VERY IMPORTANT

  if (!socketRef.current) {
  socketRef.current = io(API_URL, {
  transports: ["websocket"],
  withCredentials: true
});
}

  socketRef.current.on("connect", () => {
    console.log("Socket connected:", socketRef.current.id);

    
    fetchPosts();
  });

  socketRef.current.on("new_post", (newPost) => {
  setPosts(prev => {
    if (!user) return prev;

    // prevent duplicate
    if (prev.find(p => p._id === newPost._id)) return prev;

    const isFollowing = user.following?.some(
      f => (f._id || f) === newPost.userId?._id
    );

    const isOwnPost = newPost.userId?._id === user._id;

    if (!isFollowing && !isOwnPost) return prev;

    return [newPost, ...prev];
  });
});

  socketRef.current.on("update-like", (updatedPost) => {
    setPosts(prev =>
      prev.map(p => p._id === updatedPost._id ? updatedPost : p)
    );
  });

  socketRef.current.on("new-comment", (updatedPost) => {
    setPosts(prev =>
      prev.map(p => p._id === updatedPost._id ? updatedPost : p)
    );
  });

  socketRef.current.on("delete_post", (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  });
  // 🔥 PROFILE REAL-TIME UPDATE
socketRef.current.on("profile_updated", (updatedUser) => {
  // update logged user
  setUser(prev =>
    prev && prev._id === updatedUser._id ? updatedUser : prev
  );

  // update profile page
  setProfileUser(prev =>
    prev && prev._id === updatedUser._id ? updatedUser : prev
  );

  // update posts (username change)
  setPosts(prev =>
    prev.map(post =>
      post.userId?._id === updatedUser._id
        ? { ...post, userId: updatedUser }
        : post
    )
  );
});
// 🔥 FOLLOW REALTIME UPDATE
socketRef.current.on("follow_updated", ({ currentUser, targetUser }) => {

  // update logged user
  setUser(prev =>
    prev && prev._id === currentUser._id ? currentUser : prev
  );

  // update profile page
  setProfileUser(prev =>
    prev && prev._id === targetUser._id ? targetUser : prev
  );
  if (profileUser?._id === targetUser._id) {
  setProfileUser(targetUser);
}

});


  return () => socketRef.current.disconnect();
}, [token, API_URL]); 


  const getHeaders = useCallback((auth = true) => {
    const h = { 'ngrok-skip-browser-warning': 'true' };
    if (auth && token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, [token]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/profile`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setProfileUser(data);
      } else {
        handleLogout();
      }
    } catch (err) {
      setError("Backend unreachable. Check your backened server URL in settings.");
    }
  }, [getHeaders, API_URL]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/posts`, { headers: getHeaders(true) });
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError("Failed to load feed.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders, API_URL]);

  const fetchSuggestedUsers = useCallback(async () => {
  try {
    const res = await fetch(`${API_URL}/users`, {
      headers: getHeaders(true)
    });

    const data = await res.json();
    setSuggestedUsers(data);

  } catch (err) {
    console.log(err);
  }
}, [API_URL, getHeaders]);

  useEffect(() => {
  if (!token) return;

  const load = async () => {
    await fetchProfile();   
    await fetchPosts();     
    fetchSuggestedUsers();
  };

  load();

}, [token]);

  const handleAuth = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const endpoint = type === 'login' ? '/login' : '/register';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { ...getHeaders(false), 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });
      
      const responseText = await res.text();
      
      if (res.ok) {
        if (type === 'login') {
          const data = JSON.parse(responseText);
          localStorage.setItem('token', data.token);
          setToken(data.token);
        } else {
          setView('login');
          setError('Success! Now sign in with your account.');
        }
      } else {
        setError(responseText || "Authentication failed");
      }
    } catch (err) {
      setError("Network Error. Check your backend status.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postData.image) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('caption', postData.caption);
    formData.append('image', postData.image);
    try {
      const res = await fetch(`${API_URL}/create-post`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData
      });
      if (res.ok) {
  setPostData({ caption: '', image: null });
  setView('feed');

  await fetchPosts();   
} else {
        setError(await res.text());
      }
    } catch (err) { setError("Post failed. Check server console."); }
    finally { setLoading(false); }
  };

  const handleDeletePost = async (postId) => {
  try {
    const res = await fetch(`${API_URL}/delete-post/${postId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.text();
    console.log("DELETE RESPONSE:", data);

    // ✅ remove from UI instantly
    setPosts(prev => prev.filter(p => p._id !== postId));
    await fetchPosts();

  } catch (err) {
    console.log(err);
  }
};

const handleLike = async (postId) => {
  if (!user) return;
  // 🔥 1. animation trigger
  setLikedPostId(postId);

  // 🔥 2. update UI instantly (IMPORTANT)
  setPosts(prev =>
    prev.map(post =>
      post._id === postId
        ? {
            ...post,
            likes: post.likes?.some(id => id.toString() === user._id)
              ? post.likes.filter(id => id.toString() !== user._id)
              : [...(post.likes || []), user._id]
          }
        : post
    )
  );

  // 🔥 3. backend call (no delay)
  try {
    await fetch(`${API_URL}/like`, {
      method: "PUT",
      headers: {
        ...getHeaders(true),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ postId })
    });
  } catch (err) {
    console.log(err);
  }

  // 🔥 4. stop animation
  setTimeout(() => setLikedPostId(null), 500);
  await fetchPosts();
};
const handleComment = async (postId, text) => {
  if (!text) return;

  try {
    const res = await fetch(`${API_URL}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ postId, text })
    });

    const updatedPost = await res.json();

    setPosts(prev =>
      prev.map(p => p._id === postId ? updatedPost : p)
    );
  } catch (err) {
    console.error(err);
  }
};
const handleProfileUpdate = async (name) => {
  try {
    const res = await fetch(`${API_URL}/update-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    const data = await res.json();

    // ✅ VERY IMPORTANT (fix)
    setUser(data);          // update navbar name
    setProfileUser(data);  

    alert("Profile updated ✅");

  } catch (err) {
    console.log(err);
  }
};
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setView('login');
  };

  

  return (
    <>
    
      {!token ? (
        <AuthView 
          view={view}
          setView={setView}
          authData={authData}
          setAuthData={setAuthData}
          handleAuth={handleAuth}
          loading={loading}
          error={error}
          API_URL={API_URL}
          setShowConfig={setShowSettings}
        />
      ) : (
        <Dashboard 
          user={user}
          setUser={setUser}
          profileUser={profileUser}
          setProfileUser={setProfileUser}
          view={view}
          setView={setView}
          posts={posts}
          fetchPosts={fetchPosts}
          token={token}
          handleCreatePost={handleCreatePost}
          handleDeletePost={handleDeletePost}
          handleLogout={handleLogout}
          postData={postData}
          setPostData={setPostData}
          loading={loading}
          API_URL={API_URL}
          handleLike={handleLike}
          likedPostId={likedPostId}
          handleComment={handleComment}
          activePostId={activePostId}
          setActivePostId={setActivePostId}
          commentInputs={commentInputs}
          setCommentInputs={setCommentInputs}
          handleProfileUpdate={handleProfileUpdate}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          suggestedUsers={suggestedUsers}
          setSuggestedUsers={setSuggestedUsers}
        />
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-8 rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-black">Backend Setup</h3>
               <button onClick={() => setShowSettings(false)} className="p-2 text-slate-400 hover:text-slate-900"><X size={20}/></button>
             </div>
             <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
               Paste your current <span className="text-blue-600 font-bold">backend url</span> below.
             </p>
             <InputField icon={Globe} type="text" placeholder="https://....ngrok-free.dev" value={API_URL} onChange={(e) => setApiURL(e.target.value)} />
             <div className="mt-6">
               <GradientButton onClick={() => setShowSettings(false)} color="blue">Save Connection</GradientButton>
             </div>
          </div>
        </div>
      )}
    </>
  );
}