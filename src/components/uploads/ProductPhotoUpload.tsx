import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ProductPhoto {
  id: string;
  url: string;
  file_name: string;
  is_main: boolean;
  photo_type?: 'customer' | 'factory';
}

interface ProductPhotoUploadProps {
  orderItemId?: string;
  sourcingItemId?: string;
  photos: ProductPhoto[];
  onPhotosChange: (photos: ProductPhoto[]) => void;
  maxPhotos?: number;
  photoType?: 'customer' | 'factory';
  label?: string;
}

export function ProductPhotoUpload({ 
  orderItemId, 
  sourcingItemId, 
  photos, 
  onPhotosChange,
  maxPhotos = 10,
  photoType = 'customer',
  label = 'Product Photos'
}: ProductPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadPhoto = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${orderItemId || sourcingItemId || 'temp'}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('product-photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-photos')
      .getPublicUrl(filePath);

    return { url: publicUrl, file_name: file.name };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(uploadPhoto);
      const uploaded = await Promise.all(uploadPromises);
      
      const newPhotos: ProductPhoto[] = uploaded.map((item, index) => ({
        id: `temp-${Date.now()}-${index}`,
        url: item.url,
        file_name: item.file_name,
        is_main: photos.length === 0 && index === 0,
        photo_type: photoType,
      }));

      onPhotosChange([...photos, ...newPhotos]);
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error: any) {
      toast.error('Failed to upload photos: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    // If we removed the main photo, make the first remaining one main
    if (updatedPhotos.length > 0 && !updatedPhotos.some(p => p.is_main)) {
      updatedPhotos[0].is_main = true;
    }
    onPhotosChange(updatedPhotos);
  };

  const setMainPhoto = (photoId: string) => {
    const updatedPhotos = photos.map(p => ({
      ...p,
      is_main: p.id === photoId,
    }));
    onPhotosChange(updatedPhotos);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{photos.length}/{maxPhotos}</span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div 
            key={photo.id} 
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden border-2 group",
              photo.is_main ? "border-primary" : "border-border"
            )}
          >
            <img 
              src={photo.url} 
              alt={photo.file_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={() => setMainPhoto(photo.id)}
                title="Set as main photo"
              >
                <Star className={cn("h-4 w-4", photo.is_main && "fill-yellow-500 text-yellow-500")} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={() => removePhoto(photo.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {photo.is_main && (
              <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                Main
              </div>
            )}
          </div>
        ))}
        
        {photos.length < maxPhotos && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Photo</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}
