import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, X, FileIcon, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ProjectFile {
  id: string;
  url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  uploaded_at?: string;
}

interface DesignFileUploadProps {
  orderId?: string;
  sourcingProjectId?: string;
  files: ProjectFile[];
  onFilesChange: (files: ProjectFile[]) => void;
  maxFiles?: number;
}

export function DesignFileUpload({ 
  orderId, 
  sourcingProjectId, 
  files, 
  onFilesChange,
  maxFiles = 20 
}: DesignFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      ppt: '📽️',
      pptx: '📽️',
      ai: '🎨',
      psd: '🎨',
      eps: '🖼️',
      svg: '🖼️',
      zip: '📦',
      rar: '📦',
    };
    return icons[ext || ''] || '📎';
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${orderId || sourcingProjectId || 'temp'}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('design-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('design-files')
      .getPublicUrl(filePath);

    return { 
      url: publicUrl, 
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = Array.from(selectedFiles).map(uploadFile);
      const uploaded = await Promise.all(uploadPromises);
      
      const newFiles: ProjectFile[] = uploaded.map((item, index) => ({
        id: `temp-${Date.now()}-${index}`,
        url: item.url,
        file_name: item.file_name,
        file_type: item.file_type,
        file_size: item.file_size,
        uploaded_at: new Date().toISOString(),
      }));

      onFilesChange([...files, ...newFiles]);
      toast.success(`${selectedFiles.length} file(s) uploaded`);
    } catch (error: any) {
      toast.error('Failed to upload files: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Design Files</span>
        <span className="text-xs text-muted-foreground">{files.length}/{maxFiles}</span>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{getFileIcon(file.file_name)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                    {file.uploaded_at && ` • ${formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => window.open(file.url, '_blank')}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {files.length < maxFiles && (
        <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer transition-colors">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload design files (PDF, AI, PSD, etc.)</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
            accept=".pdf,.ai,.psd,.eps,.svg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
          />
        </label>
      )}
    </div>
  );
}
