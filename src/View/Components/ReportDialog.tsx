import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
} from '@mui/material';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string, comment: string) => Promise<void>;
  disabled?: boolean;
}

const reasonOptions = [
  'spam',
  'harassment',
  'hate_speech',
  'nudity',
  'misinformation',
  'other',
];

const ReportDialog: React.FC<ReportDialogProps> = ({ open, onClose, onSubmit, disabled }) => {
  const [reportReason, setReportReason] = useState<string>('');
  const [reportComment, setReportComment] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Reset form on open
  useEffect(() => {
    if (open) {
      setReportReason('');
      setReportComment('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reportReason) {
      setError('Please select a reason.');
      return;
    }
    if (reportReason === 'other' && reportComment.trim() === '') {
      setError('Please provide a comment for "Other".');
      return;
    }

    setError('');
    await onSubmit(reportReason, reportReason === 'other' ? reportComment : '');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Report Post</DialogTitle>
      <DialogContent dividers>
        <RadioGroup
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
        >
          {reasonOptions.map((option) => (
            <FormControlLabel
              key={option}
              value={option}
              control={<Radio />}
              label={option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
              disabled={disabled}
            />
          ))}
        </RadioGroup>

        {reportReason === 'other' && (
          <TextField
            autoFocus
            margin="normal"
            label="Please specify"
            type="text"
            fullWidth
            multiline
            minRows={2}
            value={reportComment}
            onChange={(e) => setReportComment(e.target.value)}
            disabled={disabled}
          />
        )}
        {error && (
          <p style={{ color: 'red', marginTop: 8, fontSize: '0.9rem' }}>{error}</p>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={disabled}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={disabled}>
          {disabled ? 'Reporting...' : 'Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
