// Supabase initialization
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(
  'https://myeqpxnpyurmxqtovdec.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZXFweG5weXVybXhxdG92ZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzA0MzgsImV4cCI6MjA3ODEwNjQzOH0.X5aSsAzjvHvaaiOjM9f_M7gajFOpobn3IX623WFUzBA'
);