/**
 * Sheba Sound — Artist Profile Page (Management)
 * -------------------------------------------------
 * Compact Spotify-style profile management for logged-in artists.
 * Features:
 *   • Compact header with avatar, name, stats in one row
 *   • Inline edit mode toggle
 *   • Profile photo edit overlay on hover
 *   • Total streams, songs, and albums stats
 *   • Social media links management
 * Saves changes via PATCH /api/auth/artist/profile/.
 */

import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  Box, Typography, TextField, Button, Avatar, Grid,
  Divider, IconButton, Tooltip, CircularProgress, useTheme,
  Collapse, InputAdornment, Fade,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import VerifiedIcon from '@mui/icons-material/Verified';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LanguageIcon from '@mui/icons-material/Language';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import AlbumIcon from '@mui/icons-material/Album';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoSizeSelectActualIcon from '@mui/icons-material/PhotoSizeSelectActual';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { formatStreamCount } from '@/utils/helpers';
import {
  useGetMyArtistProfileQuery,
  useUpdateMyArtistProfileMutation,
  useUploadArtistImageMutation,
  useRemoveArtistImageMutation,
  useGetMySongsQuery,
  useGetMyAlbumsQuery,
} from '@/features/music/musicApi';

const MAX_IMAGE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface ProfileForm {
  stage_name: string;
  bio: string;
  twitter: string;
  instagram: string;
  youtube: string;
  tiktok: string;
}

/* ------------------------------------------------------------------ */
/*  Compact stat pill                                                   */
/* ------------------------------------------------------------------ */
const StatPill: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
}> = ({ icon, value, label }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.75,
        borderRadius: 500,
        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
        },
      }}
    >
      <Box sx={{ color: '#12A64A', display: 'flex', fontSize: 14 }}>{icon}</Box>
      <Typography
        variant="body2"
        sx={{ fontWeight: 800, fontSize: '0.82rem', lineHeight: 1 }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.62rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

const ArtistProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useGetMyArtistProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateMyArtistProfileMutation();
  const [uploadImage, { isLoading: isUploadingImage }] = useUploadArtistImageMutation();
  const [removeImage, { isLoading: isRemovingImage }] = useRemoveArtistImageMutation();
  const { data: mySongs = [] } = useGetMySongsQuery();
  const { data: myAlbums = [] } = useGetMyAlbumsQuery();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    stage_name: '',
    bio: '',
    twitter: '',
    instagram: '',
    youtube: '',
    tiktok: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverHover, setCoverHover] = useState(false);

  // Populate form once profile loads
  useEffect(() => {
    if (profile) {
      const sl = profile.social_links ?? {};
      setForm({
        stage_name: profile.stage_name ?? '',
        bio: profile.bio ?? '',
        twitter: String(sl['twitter'] ?? ''),
        instagram: String(sl['instagram'] ?? ''),
        youtube: String(sl['youtube'] ?? ''),
        tiktok: String(sl['tiktok'] ?? ''),
      });
      setAvatarPreview(profile.profile_image_url ?? null);
      setCoverPreview(profile.cover_image_url ?? null);
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /** Validate and stage a file for either 'profile' or 'cover' */
  const validateAndStage = (
    file: File,
    type: 'profile' | 'cover',
  ): boolean => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      dispatch(showSnackbar({ message: 'Please select a valid image (JPEG, PNG, WebP, or GIF).', severity: 'warning' }));
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      dispatch(showSnackbar({ message: `Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB.`, severity: 'warning' }));
      return false;
    }
    const url = URL.createObjectURL(file);
    if (type === 'profile') {
      setAvatarFile(file);
      setAvatarPreview(url);
    } else {
      setCoverFile(file);
      setCoverPreview(url);
    }
    return true;
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (validateAndStage(file, 'profile')) {
      dispatch(showSnackbar({ message: 'Profile photo preview updated. Click Save to apply.', severity: 'info' }));
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (validateAndStage(file, 'cover')) {
      dispatch(showSnackbar({ message: 'Cover image preview updated. Click Save to apply.', severity: 'info' }));
    }
  };

  /** Upload a staged image file */
  const handleImageUpload = async (type: 'profile' | 'cover'): Promise<void> => {
    const file = type === 'profile' ? avatarFile : coverFile;
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    try {
      await uploadImage(formData).unwrap();
      dispatch(showSnackbar({
        message: `${type === 'profile' ? 'Profile photo' : 'Cover image'} updated! 🎉`,
        severity: 'success',
      }));
      if (type === 'profile') setAvatarFile(null);
      else setCoverFile(null);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to upload image. Please try again.', severity: 'error' }));
    }
  };

  /** Remove an image */
  const handleImageRemove = async (type: 'profile' | 'cover'): Promise<void> => {
    try {
      await removeImage(type).unwrap();
      dispatch(showSnackbar({
        message: `${type === 'profile' ? 'Profile photo' : 'Cover image'} removed.`,
        severity: 'info',
      }));
      if (type === 'profile') {
        setAvatarPreview(null);
        setAvatarFile(null);
      } else {
        setCoverPreview(null);
        setCoverFile(null);
      }
    } catch {
      dispatch(showSnackbar({ message: 'Failed to remove image.', severity: 'error' }));
    }
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.stage_name.trim()) {
      dispatch(showSnackbar({ message: 'Stage name is required.', severity: 'warning' }));
      return;
    }
    try {
      // Upload any staged images first
      if (avatarFile) await handleImageUpload('profile');
      if (coverFile) await handleImageUpload('cover');

      await updateProfile({
        stage_name: form.stage_name,
        bio: form.bio,
        social_links: {
          twitter: form.twitter,
          instagram: form.instagram,
          youtube: form.youtube,
          tiktok: form.tiktok,
        },
      }).unwrap();
      dispatch(showSnackbar({ message: 'Profile updated successfully!', severity: 'success' }));
      setIsEditing(false);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to save profile. Please try again.', severity: 'error' }));
    }
  };

  const handleCancel = (): void => {
    if (profile) {
      const sl = profile.social_links ?? {};
      setForm({
        stage_name: profile.stage_name ?? '',
        bio: profile.bio ?? '',
        twitter: String(sl['twitter'] ?? ''),
        instagram: String(sl['instagram'] ?? ''),
        youtube: String(sl['youtube'] ?? ''),
        tiktok: String(sl['tiktok'] ?? ''),
      });
      setAvatarPreview(profile.profile_image_url ?? null);
      setAvatarFile(null);
      setCoverPreview(profile.cover_image_url ?? null);
      setCoverFile(null);
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#12A64A' }} />
      </Box>
    );
  }

  const songCount = mySongs.length;
  const albumCount = myAlbums.length;
  const totalStreams = profile?.total_streams ?? 0;
  const followerCount = profile?.followers_count ?? 0;
  const socialLinks = profile?.social_links ?? {};
  const hasSocials = Object.values(socialLinks).some((v) => v);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* ================================================================ */}
      {/*  Cover Banner — editable large rectangle                          */}
      {/* ================================================================ */}
      <Box
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          mb: 3,
          background: isDark
            ? 'linear-gradient(180deg, rgba(18,166,74,0.08) 0%, rgba(10,10,15,0.95) 100%)'
            : 'linear-gradient(180deg, rgba(7,137,48,0.06) 0%, #fff 100%)',
          border: isDark
            ? '1px solid rgba(255,255,255,0.05)'
            : '1px solid rgba(0,0,0,0.06)',
          position: 'relative',
        }}
      >
        {/* Cover image area */}
        <Box
          sx={{
            position: 'relative',
            height: { xs: 160, sm: 220, md: 280 },
            cursor: isEditing ? 'pointer' : 'default',
            overflow: 'hidden',
          }}
          onMouseEnter={() => setCoverHover(true)}
          onMouseLeave={() => setCoverHover(false)}
          onClick={() => isEditing && coverInputRef.current?.click()}
        >
          {/* Cover image / placeholder */}
          {coverPreview ? (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${coverPreview})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'all 0.3s ease',
                filter: isEditing && coverHover ? 'brightness(0.4)' : 'brightness(0.7)',
              }}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(135deg, #078930 0%, #0A0A0F 50%, #DA121A 100%)`,
                opacity: 0.6,
                transition: 'all 0.3s ease',
                filter: isEditing && coverHover ? 'brightness(0.5)' : 'none',
              }}
            />
          )}

          {/* Gradient overlay on cover */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%)',
            }}
          />

          {/* Edit overlay for cover */}
          <Fade in={isEditing && coverHover}>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                zIndex: 2,
              }}
            >
              <PhotoSizeSelectActualIcon sx={{ color: '#fff', fontSize: 36 }} />
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {coverPreview ? 'Change Cover' : 'Add Cover Image'}
              </Typography>
              <Typography
                sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem' }}
              >
                Recommended 1500×500px
              </Typography>
            </Box>
          </Fade>

          {/* Cover staged indicator + actions */}
          {coverFile && (
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 3,
                display: 'flex',
                gap: 0.75,
              }}
            >
              <Button
                size="small"
                variant="contained"
                startIcon={
                  isUploadingImage ? (
                    <CircularProgress size={12} sx={{ color: '#fff' }} />
                  ) : (
                    <CloudUploadIcon sx={{ fontSize: 14 }} />
                  )
                }
                onClick={(e) => { e.stopPropagation(); handleImageUpload('cover'); }}
                disabled={isUploadingImage}
                sx={{
                  borderRadius: 500,
                  px: 1.5,
                  py: 0.4,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
                  boxShadow: '0 2px 12px rgba(18,166,74,0.4)',
                }}
              >
                Save Cover
              </Button>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setCoverFile(null);
                  setCoverPreview(profile?.cover_image_url ?? null);
                }}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  width: 28,
                  height: 28,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          )}

          {/* Remove cover button (when cover exists but no staged file) */}
          {!coverFile && coverPreview && isEditing && (
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 3,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); handleImageRemove('cover'); }}
                disabled={isRemovingImage}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  width: 32,
                  height: 32,
                  '&:hover': { bgcolor: 'rgba(211,47,47,0.7)' },
                }}
                title="Remove cover image"
              >
                {isRemovingImage ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <DeleteOutlineIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Box>
          )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={handleCoverSelect}
          />
        </Box>

        {/* Thin accent stripe */}
        <Box
          sx={{
            height: 3,
            background:
              'linear-gradient(90deg, #078930 0%, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%, #DA121A 100%)',
          }}
        />

        {/* Header content */}
        <Box sx={{ p: { xs: 2, sm: 3 }, mt: { xs: -5, sm: -6 }, position: 'relative', zIndex: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'center', sm: 'flex-end' },
              gap: { xs: 2, sm: 2.5 },
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            {/* Avatar with hover edit */}
            <Box
              sx={{
                position: 'relative',
                flexShrink: 0,
                cursor: isEditing ? 'pointer' : 'default',
              }}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              onClick={() => isEditing && avatarInputRef.current?.click()}
            >
              <Avatar
                src={avatarPreview ?? undefined}
                sx={{
                  width: { xs: 96, sm: 120 },
                  height: { xs: 96, sm: 120 },
                  bgcolor: '#12A64A',
                  fontSize: 48,
                  boxShadow: isDark
                    ? '0 4px 24px rgba(0,0,0,0.5), 0 0 0 4px rgba(10,10,15,0.8)'
                    : '0 4px 16px rgba(0,0,0,0.15), 0 0 0 4px #fff',
                  transition: 'all 0.3s ease',
                  filter: isEditing && avatarHover ? 'brightness(0.6)' : 'none',
                  border: '3px solid',
                  borderColor: isDark ? '#0A0A0F' : '#fff',
                }}
              >
                <PersonIcon sx={{ fontSize: 48 }} />
              </Avatar>

              {/* Edit overlay on avatar */}
              <Fade in={isEditing && avatarHover}>
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.25,
                  }}
                >
                  <CameraAltIcon sx={{ color: '#fff', fontSize: 22 }} />
                  <Typography
                    sx={{
                      color: '#fff',
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Change
                  </Typography>
                </Box>
              </Fade>

              {/* Staged profile photo indicator */}
              {avatarFile && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: '#12A64A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(18,166,74,0.4)',
                    animation: 'pulse-ring 1.5s ease-in-out infinite',
                    '@keyframes pulse-ring': {
                      '0%, 100%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.2)' },
                    },
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 11, color: '#fff' }} />
                </Box>
              )}

              {/* Verified tick on avatar */}
              {profile?.verified && !avatarFile && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: isDark ? '#0A0A0F' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <VerifiedIcon sx={{ fontSize: 18, color: '#5B9BD5' }} />
                </Box>
              )}

              {/* Profile photo actions — below avatar when staged */}
              {avatarFile && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 0.5,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleImageUpload('profile'); }}
                    disabled={isUploadingImage}
                    sx={{
                      bgcolor: '#12A64A',
                      color: '#fff',
                      width: 24,
                      height: 24,
                      '&:hover': { bgcolor: '#1ED760' },
                    }}
                    title="Save profile photo"
                  >
                    {isUploadingImage ? <CircularProgress size={10} sx={{ color: '#fff' }} /> : <CloudUploadIcon sx={{ fontSize: 12 }} />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAvatarFile(null);
                      setAvatarPreview(profile?.profile_image_url ?? null);
                    }}
                    sx={{
                      bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: 'text.secondary',
                      width: 24,
                      height: 24,
                    }}
                    title="Cancel"
                  >
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              )}

              {/* Remove profile photo */}
              {!avatarFile && avatarPreview && isEditing && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleImageRemove('profile'); }}
                    disabled={isRemovingImage}
                    sx={{
                      bgcolor: 'rgba(211,47,47,0.85)',
                      color: '#fff',
                      width: 22,
                      height: 22,
                      '&:hover': { bgcolor: '#d32f2f' },
                    }}
                    title="Remove profile photo"
                  >
                    {isRemovingImage ? <CircularProgress size={10} sx={{ color: '#fff' }} /> : <DeleteOutlineIcon sx={{ fontSize: 12 }} />}
                  </IconButton>
                </Box>
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={handleAvatarSelect}
              />
            </Box>

            {/* Name + meta */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                textAlign: { xs: 'center', sm: 'left' },
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  mb: 0.5,
                }}
              >
                {form.stage_name || profile?.stage_name || 'Your Stage Name'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {profile?.verified ? '✓ Verified Artist' : 'Artist'}
              </Typography>

              {/* Inline stats */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  mt: 1.5,
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', sm: 'flex-start' },
                }}
              >
                <StatPill
                  icon={<HeadphonesIcon sx={{ fontSize: 14 }} />}
                  value={formatStreamCount(totalStreams)}
                  label="streams"
                />
                <StatPill
                  icon={<QueueMusicIcon sx={{ fontSize: 14 }} />}
                  value={String(songCount)}
                  label="songs"
                />
                <StatPill
                  icon={<AlbumIcon sx={{ fontSize: 14 }} />}
                  value={String(albumCount)}
                  label="albums"
                />
                <StatPill
                  icon={<FavoriteIcon sx={{ fontSize: 14 }} />}
                  value={formatStreamCount(followerCount)}
                  label="followers"
                />
              </Box>
            </Box>

            {/* Action buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexShrink: 0,
                alignSelf: { xs: 'center', sm: 'flex-start' },
              }}
            >
              {!isEditing ? (
                <>
                  <Button
                    size="small"
                    startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setIsEditing(true)}
                    sx={{
                      borderRadius: 500,
                      px: 2.5,
                      py: 0.8,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      textTransform: 'none',
                      color: '#fff',
                      background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
                      boxShadow: '0 2px 12px rgba(18,166,74,0.25)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1ED760 0%, #12A64A 100%)',
                        boxShadow: '0 4px 16px rgba(18,166,74,0.35)',
                        transform: 'scale(1.03)',
                      },
                    }}
                  >
                    Edit Profile
                  </Button>
                  {profile?.id && (
                    <Tooltip title="View public profile">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/artist/${profile.id}`)}
                        sx={{
                          border: isDark
                            ? '1px solid rgba(255,255,255,0.1)'
                            : '1px solid rgba(0,0,0,0.1)',
                          width: 36,
                          height: 36,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: '#12A64A',
                            bgcolor: 'rgba(18,166,74,0.06)',
                          },
                        }}
                      >
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              ) : (
                <Tooltip title="Cancel editing">
                  <IconButton
                    size="small"
                    onClick={handleCancel}
                    sx={{
                      border: isDark
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid rgba(0,0,0,0.1)',
                      width: 36,
                      height: 36,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'error.main',
                        bgcolor: 'rgba(211,47,47,0.06)',
                      },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Bio preview (when not editing) */}
          {!isEditing && profile?.bio && (
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                color: 'text.secondary',
                lineHeight: 1.6,
                fontSize: '0.82rem',
                maxWidth: 520,
                pl: { xs: 0, sm: '120px' },
              }}
            >
              {profile.bio}
            </Typography>
          )}

          {/* Social links preview (when not editing) */}
          {!isEditing && hasSocials && (
            <Box
              sx={{
                display: 'flex',
                gap: 0.75,
                mt: 1.5,
                pl: { xs: 0, sm: '120px' },
                justifyContent: { xs: 'center', sm: 'flex-start' },
              }}
            >
              {socialLinks.twitter && (
                <Tooltip title="Twitter / X">
                  <IconButton
                    size="small"
                    component="a"
                    href={socialLinks.twitter}
                    target="_blank"
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(29,161,242,0.1)',
                        color: '#1DA1F2',
                      },
                    }}
                  >
                    <TwitterIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
              {socialLinks.instagram && (
                <Tooltip title="Instagram">
                  <IconButton
                    size="small"
                    component="a"
                    href={socialLinks.instagram}
                    target="_blank"
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(225,48,108,0.1)',
                        color: '#E1306C',
                      },
                    }}
                  >
                    <InstagramIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
              {socialLinks.youtube && (
                <Tooltip title="YouTube">
                  <IconButton
                    size="small"
                    component="a"
                    href={socialLinks.youtube}
                    target="_blank"
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(255,0,0,0.1)',
                        color: '#FF0000',
                      },
                    }}
                  >
                    <YouTubeIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
              {socialLinks.tiktok && (
                <Tooltip title="TikTok">
                  <IconButton
                    size="small"
                    component="a"
                    href={socialLinks.tiktok}
                    target="_blank"
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(105,201,208,0.1)',
                        color: '#69C9D0',
                      },
                    }}
                  >
                    <LanguageIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* ================================================================ */}
      {/*  Edit Form — Collapses open/closed                                */}
      {/* ================================================================ */}
      <Collapse in={isEditing} timeout={350}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: isDark
              ? '1px solid rgba(255,255,255,0.05)'
              : '1px solid rgba(0,0,0,0.06)',
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
            mb: 3,
          }}
        >
          {/* Section: Basic Info */}
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'text.secondary',
                mb: 2,
              }}
            >
              Basic Information
            </Typography>

            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  required
                  name="stage_name"
                  label="Stage Name"
                  value={form.stage_name}
                  onChange={handleChange}
                  disabled={isSaving}
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.88rem',
                      '&.Mui-focused fieldset': {
                        borderColor: '#12A64A',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#12A64A',
                    },
                  }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  name="bio"
                  label="Bio"
                  value={form.bio}
                  onChange={handleChange}
                  disabled={isSaving}
                  multiline
                  rows={3}
                  fullWidth
                  size="small"
                  helperText={`${form.bio.length} / 500`}
                  inputProps={{ maxLength: 500 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.88rem',
                      '&.Mui-focused fieldset': {
                        borderColor: '#12A64A',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#12A64A',
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Section: Social Links */}
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'text.secondary',
                mb: 2,
              }}
            >
              Social Links
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="twitter"
                  label="Twitter / X"
                  value={form.twitter}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="https://twitter.com/..."
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TwitterIcon sx={{ fontSize: 16, color: '#1DA1F2' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.85rem',
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="instagram"
                  label="Instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="https://instagram.com/..."
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <InstagramIcon sx={{ fontSize: 16, color: '#E1306C' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.85rem',
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="youtube"
                  label="YouTube"
                  value={form.youtube}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="https://youtube.com/..."
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <YouTubeIcon sx={{ fontSize: 16, color: '#FF0000' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.85rem',
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="tiktok"
                  label="TikTok"
                  value={form.tiktok}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="https://tiktok.com/..."
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LanguageIcon sx={{ fontSize: 16, color: '#69C9D0' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.85rem',
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Save / Cancel actions */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.5,
              p: { xs: 2, sm: 3 },
              py: { xs: 1.5, sm: 2 },
            }}
          >
            <Button
              variant="text"
              onClick={handleCancel}
              disabled={isSaving}
              sx={{
                borderRadius: 500,
                px: 3,
                py: 0.8,
                fontWeight: 700,
                fontSize: '0.82rem',
                textTransform: 'none',
                color: 'text.secondary',
                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
              disabled={isSaving}
              sx={{
                borderRadius: 500,
                px: 3,
                py: 0.8,
                fontWeight: 800,
                fontSize: '0.82rem',
                textTransform: 'none',
                background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
                boxShadow: '0 2px 12px rgba(18,166,74,0.25)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1ED760 0%, #12A64A 100%)',
                  boxShadow: '0 4px 16px rgba(18,166,74,0.35)',
                  transform: 'scale(1.02)',
                },
              }}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default ArtistProfilePage;
