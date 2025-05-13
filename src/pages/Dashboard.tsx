import React, { useState, useCallback, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  RefreshCw,
  Share2,
  Settings,
  UserCircle,
  Upload,
  Music,
  Video,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  Trash2,
  X,
  Save,
  Camera,
  History,
  HelpCircle,
  Instagram,
  Bell,
  Lock,
  Globe2,
  Palette,
  LogOut,
  Clock
} from 'lucide-react';
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  LinkedinShareButton,
  EmailShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  LinkedinIcon,
  EmailIcon
} from 'react-share';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type QRType = 'text' | 'url' | 'image' | 'video' | 'audio' | 'document';
type Tab = 'generator' | 'history' | 'help';
type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'security' | 'language' | 'theme';

interface QRCodeData {
  id: string;
  content: string;
  type: QRType;
  file_url: string | null;
  qr_url: string;
  created_at: string;
  files?: string[];
  expiry_time: string;
  notes?: string;
}

interface UserProfile {
  name: string;
  email: string;
  gender: string;
  avatar_url?: string | null;
}

interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    qrExpiry: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    shareHistory: boolean;
  };
  security: {
    twoFactor: boolean;
    sessionTimeout: number;
  };
  language: string;
  theme: 'light' | 'dark' | 'system';
}

const defaultSettings: UserSettings = {
  notifications: {
    email: true,
    push: true,
    qrExpiry: true,
  },
  privacy: {
    profileVisibility: 'private',
    shareHistory: false,
  },
  security: {
    twoFactor: false,
    sessionTimeout: 30,
  },
  language: 'en',
  theme: 'system',
};

function Dashboard() {
  const { user, signOut } = useAuth();
  const [text, setText] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState<QRType>('text');
  const [files, setFiles] = useState<File[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [previousQRCodes, setPreviousQRCodes] = useState<QRCodeData[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('generator');
  const [notes, setNotes] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('profile');
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPreviousQRCodes();
    loadUserProfile();
    const interval = setInterval(cleanupExpiredQRCodes, 60000);
    return () => clearInterval(interval);
  }, []);

  const cleanupExpiredQRCodes = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('qr_codes')
      .delete()
      .lt('expiry_time', now);

    if (error) {
      console.error('Error cleaning up expired QR codes:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, email, gender, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
      setEditingProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 50 * 1024 * 1024) {
        setProfileError('Avatar must be less than 50MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setProfileError('Please upload an image file');
        return;
      }

      setUploadingAvatar(true);
      setProfileError('');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setEditingProfile(prev => ({ ...prev!, avatar_url: publicUrl }));
      setUserProfile(prev => ({ ...prev!, avatar_url: publicUrl }));
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setProfileError('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!editingProfile) return;

    try {
      setIsSaving(true);
      setProfileError('');

      const { error } = await supabase
        .from('users')
        .update({
          name: editingProfile.name,
          gender: editingProfile.gender,
        })
        .eq('id', user?.id);

      if (error) throw error;

      setUserProfile(editingProfile);
      setShowProfile(false);
    } catch (err) {
      setProfileError('Failed to update profile');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const loadPreviousQRCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPreviousQRCodes(data || []);
    } catch (err) {
      console.error('Error loading QR codes:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const validFiles = selectedFiles.filter(file => {
      if (file.size > 2 * 1024 * 1024 * 1024) {
        setError(`File ${file.name} exceeds 2GB limit`);
        return false;
      }
      return true;
    });

    setFiles(prevFiles => [...prevFiles, ...validFiles]);
    setText(validFiles.map(f => f.name).join(', '));
  };

  const uploadFiles = async (files: File[]) => {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('qr-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('qr-files')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleShare = (url: string, title: string) => {
    setShareUrl(url);
    setShareTitle(title || 'Check out my QR Code');
    setShowShare(true);
  };

  const handleInstagramShare = () => {
    window.open(`instagram://library?AssetPath=${encodeURIComponent(shareUrl)}`);
  };

  const deleteQRCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .match({ id });

      if (error) throw error;
      await loadPreviousQRCodes();
    } catch (err) {
      console.error('Error deleting QR code:', err);
    }
  };

  const clearInputs = () => {
    setText('');
    setFiles([]);
    setNotes('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveNotes = async () => {
    if (!qrUrl) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('qr_codes')
        .update({ notes })
        .eq('qr_url', qrUrl);

      if (error) throw error;
      await loadPreviousQRCodes();
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save notes');
    } finally {
      setIsLoading(false);
    }
  };

  const generateQR = useCallback(async () => {
    if (!text.trim() && files.length === 0) {
      setError('Please enter some text or select files');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      let fileUrls: string[] = [];
      let content = text;

      if (files.length > 0) {
        fileUrls = await uploadFiles(files);
        content = fileUrls.join('\n');
      }

      const qrUrl = await QRCode.toDataURL(content, {
        width: 400,
        margin: 2,
        color: {
          dark: '#4F46E5',
          light: '#ffffff',
        },
      });

      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 2);

      const { error } = await supabase
        .from('qr_codes')
        .insert([{
          user_id: user?.id,
          content,
          type,
          file_url: fileUrls[0] || null,
          files: fileUrls,
          qr_url: qrUrl,
          expiry_time: expiryTime.toISOString(),
          notes: notes || null
        }]);

      if (error) throw error;

      setQrUrl(qrUrl);
      await loadPreviousQRCodes();
      clearInputs();
    } catch (err) {
      setError('Failed to generate QR code');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [text, files, type, user, notes]);

  const downloadQR = useCallback(() => {
    if (!qrUrl) return;
    
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrUrl]);

  const getTypeIcon = (type: QRType) => {
    switch (type) {
      case 'audio':
        return <Music className="w-6 h-6" />;
      case 'video':
        return <Video className="w-6 h-6" />;
      case 'document':
        return <FileText className="w-6 h-6" />;
      case 'url':
        return <LinkIcon className="w-6 h-6" />;
      case 'text':
        return <MessageSquare className="w-6 h-6" />;
      default:
        return <QrCode className="w-6 h-6" />;
    }
  };

  const renderPreview = (qrCode: QRCodeData) => {
    if (!qrCode.files?.length) return null;

    return (
      <div className="mt-4 space-y-4">
        {qrCode.files.map((url, index) => {
          if (qrCode.type === 'audio') {
            return (
              <audio key={index} controls className="w-full">
                <source src={url} type="audio/*" />
                Your browser does not support the audio element.
              </audio>
            );
          } else if (qrCode.type === 'video') {
            return (
              <video key={index} controls className="w-full">
                <source src={url} type="video/*" />
                Your browser does not support the video element.
              </video>
            );
          } else if (qrCode.type === 'image') {
            return (
              <img
                key={index}
                src={url}
                alt={`File ${index + 1}`}
                className="w-full rounded-lg"
              />
            );
          }
          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800"
            >
              View File {index + 1}
            </a>
          );
        })}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">QR Code History</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {previousQRCodes.map((qrCode) => {
          const expiryTime = new Date(qrCode.expiry_time);
          const now = new Date();
          const isExpired = expiryTime < now;
          const timeLeft = isExpired ? 'Expired' : `Expires in ${Math.ceil((expiryTime.getTime() - now.getTime()) / (1000 * 60))} minutes`;

          return (
            <div 
              key={qrCode.id} 
              className={`bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow ${
                isExpired ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <img
                  src={qrCode.qr_url}
                  alt="Previous QR Code"
                  className="w-32 h-32"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(qrCode.type)}
                      <span className="text-sm font-medium capitalize">{qrCode.type}</span>
                    </div>
                    <button
                      onClick={() => deleteQRCode(qrCode.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 break-all">
                    {qrCode.content}
                  </p>
                  {qrCode.notes && (
                    <p className="text-sm text-gray-500 mt-2 italic">
                      Note: {qrCode.notes}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-4 h-4" />
                      {timeLeft}
                    </div>
                    {!isExpired && (
                      <button
                        onClick={() => handleShare(qrCode.qr_url, qrCode.content)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Share2 size={16} />
                        Share
                      </button>
                    )}
                  </div>
                  {renderPreview(qrCode)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderHowToUse = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-gray-800">How to Use QR Code Generator</h2>
      
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <QrCode className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">Content Types</h3>
          </div>
          <div className="space-y-3 text-gray-600">
            <p>Choose from six different content types:</p>
            <ul className="grid grid-cols-2 gap-3">
              <li className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <span>Text - For plain text content</span>
              </li>
              <li className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-600" />
                <span>URL - For website links</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Document - PDF, DOC, TXT files</span>
              </li>
              <li className="flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                <span>Video - All video formats</span>
              </li>
              <li className="flex items-center gap-2">
                <Music className="w-5 h-5 text-indigo-600" />
                <span>Audio - Music and sound files</span>
              </li>
              <li className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <span>Image - JPG, PNG, GIF, etc.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">File Upload Guidelines</h3>
          </div>
          <div className="space-y-3 text-gray-600">
            <ul className="list-disc pl-5 space-y-2">
              <li>Maximum file size: 2GB per file</li>
              <li>Multiple files can be uploaded at once</li>
              <li>Files are securely stored and accessible via QR code</li>
              <li>Supported formats depend on the selected content type</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Clock className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">QR Code Lifecycle</h3>
          </div>
          <div className="space-y-3 text-gray-600">
            <ul className="list-disc pl-5 space-y-2">
              <li>QR codes are valid for 2 hours from generation</li>
              <li>Expired codes are automatically removed</li>
              <li>Track remaining time in the History tab</li>
              <li>Download codes before expiry for permanent access</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Share2 className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">Sharing Options</h3>
          </div>
          <div className="space-y-3 text-gray-600">
            <p>Share your QR codes through multiple channels:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Download as PNG image</li>
              <li>Share directly to social media platforms</li>
              <li>Send via email</li>
              <li>Copy link for instant sharing</li>
            </ul>
          </div>
        </div>

        <div className="bg-indigo-50 p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            <h3 className="text-lg font-medium text-indigo-800">Tips & Best Practices</h3>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-indigo-700">
            <li>Always test QR codes after generation</li>
            <li>Download important QR codes for offline access</li>
            <li>Use descriptive text for better organization</li>
            <li>Check file size limits before uploading</li>
            <li>Monitor expiry times in the History tab</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderSettingsContent = () => {
    switch (activeSettingsTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div 
                  className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  {editingProfile?.avatar_url ? (
                    <img
                      src={editingProfile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">Click to upload profile photo</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingProfile?.name || ''}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev!, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingProfile?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={editingProfile?.gender || ''}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev!, gender: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: !prev.notifications.email }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications.email ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                  <p className="text-sm text-gray-500">Receive instant notifications</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, push: !prev.notifications.push }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications.push ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.push ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">QR Code Expiry</h3>
                  <p className="text-sm text-gray-500">Get notified before QR codes expire</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, qrExpiry: !prev.notifications.qrExpiry }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications.qrExpiry ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.qrExpiry ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Visibility
                </label>
                <select
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    privacy: { ...prev.privacy, profileVisibility: e.target.value as 'public' | 'private' }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Share QR History</h3>
                  <p className="text-sm text-gray-500">Allow others to view your QR code history</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    privacy: { ...prev.privacy, shareHistory: !prev.privacy.shareHistory }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.privacy.shareHistory ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privacy.shareHistory ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, twoFactor: !prev.security.twoFactor }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.security.twoFactor ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.security.twoFactor ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ru">Русский</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Theme
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['light', 'dark', 'system'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setSettings(prev => ({ ...prev, theme }))}
                    className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-colors ${
                      settings.theme === theme
                        ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <Palette className="w-6 h-6" />
                    <span className="text-sm font-medium capitalize">{theme}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
  <div className="flex items-center gap-3">
    <QrCode className="w-8 h-8 text-indigo-600 transition-transform duration-300 hover:scale-105" />

    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text transition-transform duration-300 hover:scale-105">
      QR Code Generator
    </h1>
  </div>
  <button
    onClick={() => setShowSettings(true)}
    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:bg-gray-100 hover:scale-105"
  >
    <Settings className="w-6 h-6 text-gray-600" />
  </button>
</div>

      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full">
  <button
    onClick={() => setActiveTab('generator')}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto ${
      activeTab === 'generator'
        ? 'bg-indigo-100 text-indigo-600'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <QrCode className="w-5 h-5" />
    Generator
  </button>
  <button
    onClick={() => setActiveTab('history')}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto ${
      activeTab === 'history'
        ? 'bg-indigo-100 text-indigo-600'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <History className="w-5 h-5" />
    History
  </button>
  <button
    onClick={() => setActiveTab('help')}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto ${
      activeTab === 'help'
        ? 'bg-indigo-100 text-indigo-600'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <HelpCircle className="w-5 h-5" />
    How to Use
  </button>
</div>


          {activeTab === 'generator' ? (
            <>
              <form onSubmit={(e) => { e.preventDefault(); generateQR(); }} className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {(['text', 'url', 'image', 'video', 'audio', 'document'] as QRType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-colors ${
                        type === t
                          ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      {getTypeIcon(t)}
                      <span className="text-sm font-medium capitalize">{t}</span>
                    </button>
                  ))}
                </div>

                {type === 'text' || type === 'url' ? (
                  <div>
                    <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                      Enter {type}
                    </label>
                    <input
                      type="text"
                      id="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={type === 'url' ? 'https://example.com' : 'Enter your text here'}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload {type}
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-300 transition-colors">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>Upload files</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              multiple
                              accept={
                                type === 'image' ? 'image/*' :
                                type === 'video' ? 'video/*' :
                                type === 'audio' ? 'audio/*' :
                                type === 'document' ? '.pdf,.doc,.docx,.txt' : undefined
                              }
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">
                          {files.length > 0 
                            ? `${files.length} file(s) selected`
                            : 'Max file size: 2GB per file'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      'Generate QR Code'
                    )}
                  </button>

                  {qrUrl && (
                    <>
                      <button
                        type="button"
                        onClick={downloadQR}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShare(qrUrl, text)}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <Share2 className="w-5 h-5" />
                        Share
                      </button>
                    </>
                  )}
                </div>
              </form>

              {qrUrl && (
                <div className="mt-8">
                  <div className="flex justify-center">
                    <div className="p-8 bg-white rounded-2xl shadow-lg">
                      <img
                        src={qrUrl}
                        alt="Generated QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                  </div>

                  <div className="mt-6 max-w-lg mx-auto">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Add Notes
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-24"
                      placeholder="Add any notes about this QR code..."
                    />
                    <button
                      onClick={saveNotes}
                      disabled={isLoading}
                      className="mt-2 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Notes
                        </>
                      )}
                    </button>
                  </div>

                  {showShare && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Share QR Code</h3>
                      <div className="flex justify-center gap-4 flex-wrap">
                        <FacebookShareButton url={shareUrl} title={shareTitle}>
                          <FacebookIcon size={40} round />
                        </FacebookShareButton>
                        <TwitterShareButton url={shareUrl} title={shareTitle}>
                          <TwitterIcon size={40} round />
                        </TwitterShareButton>
                        <WhatsappShareButton url={shareUrl} title={shareTitle}>
                          <WhatsappIcon size={40} round />
                        </WhatsappShareButton>
                        <LinkedinShareButton url={shareUrl} title={shareTitle}>
                          <LinkedinIcon size={40} round />
                        </LinkedinShareButton>
                        <EmailShareButton url={shareUrl} subject={shareTitle}>
                          <EmailIcon size={40} round />
                        </EmailShareButton>
                        <button
                          onClick={handleInstagramShare}
                          className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-2 rounded-full hover:from-purple-600 hover:via-pink-600 hover:to-red-600 transition-colors"
                        >
                          <Instagram className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : activeTab === 'history' ? (
            renderHistory()
          ) : (
            renderHowToUse()
          )}
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex gap-8">
              <div className="w-1/4 space-y-2">
                <button
                  onClick={() => setActiveSettingsTab('profile')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeSettingsTab === 'profile'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <UserCircle className="w-5 h-5" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveSettingsTab('notifications')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeSettingsTab === 'notifications'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  Notifications
                </button>
                <button
                  onClick={() => setActiveSettingsTab('privacy')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeSettingsTab === 'privacy'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  Privacy
                </button>
                <button
                  onClick={() => setActiveSettingsTab('security')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeSettingsTab === 'security'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  Security
                </button>
                <button
                  onClick={() => setActiveSettingsTab('language')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeSettingsTab === 'language'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Globe2 className="w-5 h-5" />
                  Language
                </button>
                <button
                  onClick={() => setActiveSettingsTab('theme')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeSettingsTab === 'theme'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Palette className="w-5 h-5" />
                  Theme
                </button>
                <hr className="my-4" />
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
              <div className="flex-1 min-h-[400px]">
                {renderSettingsContent()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;