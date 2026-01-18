import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload, Loader2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QCPhotoUploadProps {
  itemId: string;
  existingPhotos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export function QCPhotoUpload({ itemId, existingPhotos, onPhotosChange }: QCPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(existingPhotos || []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newPhotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${itemId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-photos')
          .upload(`qc-inspections/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-photos')
          .getPublicUrl(`qc-inspections/${fileName}`);

        newPhotos.push(urlData.publicUrl);
      }

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);
      toast.success(`${newPhotos.length} photo(s) uploaded / 照片已上传`);
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (photoUrl: string) => {
    const updatedPhotos = photos.filter(p => p !== photoUrl);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            asChild
          >
            <span>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Upload Photos / 上传照片'}
            </span>
          </Button>
        </label>
        {photos.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {photos.length} photo(s)
          </span>
        )}
      </div>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative group w-20 h-20 rounded-md overflow-hidden border"
            >
              <img
                src={photo}
                alt={`QC Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(photo)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <a
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <ImageIcon className="h-5 w-5 text-white" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
