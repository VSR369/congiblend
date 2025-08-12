import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Card } from './card';
import { Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PollComposerProps {
  question: string;
  onQuestionChange: (question: string) => void;
  options: string[];
  onOptionsChange: (options: string[]) => void;
  duration: number;
  onDurationChange: (days: number) => void;
  className?: string;
}

export const PollComposer: React.FC<PollComposerProps> = ({
  question,
  onQuestionChange,
  options,
  onOptionsChange,
  duration,
  onDurationChange,
  className
}) => {
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onOptionsChange(newOptions);
  };

  const addOption = () => {
    if (options.length < 4) {
      onOptionsChange([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      onOptionsChange(newOptions);
    }
  };

  // Local duration controls (amount + unit) while passing days to parent
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks'>(duration % 7 === 0 ? 'weeks' : 'days');
  const [durationAmount, setDurationAmount] = useState<number>(duration % 7 === 0 ? duration / 7 : duration);

  useEffect(() => {
    // Sync when parent duration changes
    const unit = duration % 7 === 0 ? 'weeks' : 'days';
    setDurationUnit(unit);
    setDurationAmount(unit === 'weeks' ? duration / 7 : duration);
  }, [duration]);

  const handleDurationAmountChange = (value: string) => {
    const parsed = parseInt(value || '1', 10);
    const amount = isNaN(parsed) ? 1 : Math.max(1, Math.min(30, parsed));
    setDurationAmount(amount);
    const days = durationUnit === 'weeks' ? amount * 7 : amount;
    onDurationChange(days);
  };

  const handleDurationUnitChange = (unit: 'days' | 'weeks') => {
    setDurationUnit(unit);
    const days = unit === 'weeks' ? durationAmount * 7 : durationAmount;
    onDurationChange(days);
  };
  const getEndDate = () => {
    const endDate = new Date();
    const days = durationUnit === 'weeks' ? durationAmount * 7 : durationAmount;
    endDate.setDate(endDate.getDate() + days);
    return endDate.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Poll Question</label>
        <Textarea
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          className="min-h-[60px] resize-none"
          maxLength={300}
        />
        <div className="text-xs text-muted-foreground text-right">
          {question.length}/300 characters
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Poll Options</label>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                maxLength={100}
                className="flex-1"
              />
              {options.length > 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeOption(index)}
                  className="px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        {options.length < 4 && (
          <Button
            variant="outline"
            size="sm"
            onClick={addOption}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        )}
        
        <div className="text-xs text-muted-foreground">
          {options.length}/4 options • 2-4 options required
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Poll Duration</label>
        <div className="grid grid-cols-3 gap-2 items-center">
          <Input
            type="number"
            min={1}
            max={30}
            value={durationAmount}
            onChange={(e) => handleDurationAmountChange(e.target.value)}
            className="col-span-2"
          />
          <Select value={durationUnit} onValueChange={(value) => handleDurationUnitChange(value as 'days' | 'weeks')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          Poll will end on {getEndDate()}
        </div>
      </div>

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          People can vote and change their vote until the poll closes.
        </p>
      </div>
    </Card>
  );
};