import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDropzone } from '../components/FileDropzone';
import { UploadProgress } from '../components/UploadProgress';
import { ParseStatusStepper } from '../components/ParseStatusStepper';
import type { StepStatus } from '../components/ParseStatusStepper';
import { useUploadResumeMutation } from '../hooks/useResumeQueries';
import { useParseStatusPolling } from '../hooks/useParseStatusPolling';
import { ArrowLeft, CheckCircle2, AlertOctagon } from 'lucide-react';
import { toast } from 'sonner';

export function ResumeUploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState('Idle');

  const uploadMutation = useUploadResumeMutation();
  const { data: pollData, error: pollError } = useParseStatusPolling(resumeId || '', pollingActive);

  // Trigger file upload when user drops/selects a file
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadProgress(10);
    setStatusText('File selected. Ready to upload...');
  };

  const handleStartUpload = () => {
    if (!selectedFile) return;
    
    setUploadProgress(30);
    setStatusText('Uploading resume file to backend...');

    uploadMutation.mutate(selectedFile, {
      onSuccess: (data) => {
        setResumeId(data.id);
        setPollingActive(true);
        setUploadProgress(60);
        setStatusText('File uploaded successfully. AI Parsing started...');
        toast.success('Resume uploaded! Starting analysis...');
      },
      onError: (err: any) => {
        setUploadProgress(0);
        setSelectedFile(null);
        toast.error(err.response?.data?.detail || 'Failed to upload resume.');
      }
    });
  };

  // Handle polling updates
  useEffect(() => {
    if (!pollData) return;

    const status = pollData.parse_status;
    if (status === 'processing') {
      setUploadProgress(80);
      setStatusText('Extracting text and identifying profile details...');
    } else if (status === 'success') {
      setUploadProgress(100);
      setStatusText('Vector indexing complete. Resume fully analyzed!');
      setPollingActive(false);
      toast.success('Resume parsing complete!');
    } else if (status === 'failed') {
      setPollingActive(false);
      toast.error('Resume parsing failed.');
    }
  }, [pollData]);

  // Handle polling errors
  useEffect(() => {
    if (pollError) {
      setPollingActive(false);
      toast.error('Lost connection to parsing service.');
    }
  }, [pollError]);

  // Deriving Step Statuses
  let uploadStepStatus: StepStatus = 'pending';
  let parseStepStatus: StepStatus = 'pending';
  let indexStepStatus: StepStatus = 'pending';

  if (uploadMutation.isPending) {
    uploadStepStatus = 'processing';
  } else if (uploadMutation.isSuccess) {
    uploadStepStatus = 'success';
    
    // Check polling status
    const pollStatus = pollData?.parse_status;
    if (pollStatus === 'pending' || pollStatus === 'processing') {
      parseStepStatus = 'processing';
    } else if (pollStatus === 'success') {
      parseStepStatus = 'success';
      indexStepStatus = 'success';
    } else if (pollStatus === 'failed') {
      parseStepStatus = 'failed';
    }
  } else if (uploadMutation.isError) {
    uploadStepStatus = 'failed';
  }

  const handleReset = () => {
    setSelectedFile(null);
    setResumeId(null);
    setPollingActive(false);
    setUploadProgress(0);
    setStatusText('Idle');
    uploadMutation.reset();
  };

  const isSuccess = pollData?.parse_status === 'success';
  const isFailed = pollData?.parse_status === 'failed' || uploadMutation.isError;
  const isProcessing = uploadMutation.isPending || pollingActive;

  return (
    <div className="space-y-8 animate-fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border-subtle pb-5 text-left">
        <button
          onClick={() => navigate('/app/resumes')}
          className="p-2 rounded-xl cursor-pointer text-text-muted hover:text-text-prim transition-all shrink-0 neo-raised hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-text-prim">Upload Resume</h1>
          <p className="text-text-sec text-xs mt-1">Analyze ATS keywords and extract skills from a PDF resume.</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* State A: Ready to select or select completed but not uploaded */}
        {!isProcessing && !isSuccess && !isFailed && (
          <div className="space-y-6">
            <FileDropzone 
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onClear={handleReset}
            />

            {selectedFile && (
              <button
                onClick={handleStartUpload}
                className="w-full py-3 text-xs font-bold rounded-xl cursor-pointer transition-all duration-150 text-text-prim neo-raised neo-raised-hover neo-raised-active"
              >
                Start AI Parser Ingestion
              </button>
            )}
          </div>
        )}

        {/* State B: Processing (Upload / Parse / Index) */}
        {isProcessing && (
          <div className="space-y-6">
            <UploadProgress 
              progress={uploadProgress}
              statusText={statusText}
            />
            <ParseStatusStepper 
              uploadStatus={uploadStepStatus}
              parseStatus={parseStepStatus}
              indexStatus={indexStepStatus}
            />
          </div>
        )}

        {/* State C: Success Case */}
        {isSuccess && (
          <div className="p-8 rounded-2xl flex flex-col items-center text-center space-y-6 neo-raised">
            <div className="size-16 rounded-full bg-zinc-950 border border-zinc-900 flex items-center justify-center text-text-prim animate-pulse">
              <CheckCircle2 className="size-8 stroke-[1.5]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-text-prim">Ingestion Successful!</h3>
              <p className="text-text-sec text-xs max-w-sm leading-relaxed">
                Your resume "{selectedFile?.name}" has been successfully parsed, keywords mapped, and indexed into the vector DB collection.
              </p>
            </div>
 
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                onClick={() => navigate(`/app/resumes/${resumeId}`)}
                className="px-6 py-2.5 text-xs font-bold rounded-xl cursor-pointer text-center transition-all duration-150 text-text-prim neo-raised neo-raised-hover neo-raised-active"
              >
                View ATS & Analysis Report →
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 text-xs font-bold rounded-xl cursor-pointer text-center transition-all duration-150 text-text-muted hover:text-text-prim neo-raised neo-raised-hover neo-raised-active"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}

        {/* State D: Fail Case */}
        {isFailed && (
          <div className="p-8 rounded-2xl flex flex-col items-center text-center space-y-6 neo-raised">
            <div className="size-16 rounded-full bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-400">
              <AlertOctagon className="size-8 stroke-[1.5]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-text-prim">Parsing Pipeline Failed</h3>
              <p className="text-text-sec text-xs max-w-sm leading-relaxed">
                We encountered an error while parsing the resume format or indexing keywords. Please ensure the file is not corrupted and contains selectable text content.
              </p>
            </div>
 
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 text-xs font-bold rounded-xl cursor-pointer text-center transition-all duration-150 text-text-prim neo-raised neo-raised-hover neo-raised-active"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/app/resumes')}
                className="px-6 py-2.5 text-xs font-bold rounded-xl cursor-pointer text-center transition-all duration-150 text-text-muted hover:text-text-prim neo-raised neo-raised-hover neo-raised-active"
              >
                Back to Library
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}