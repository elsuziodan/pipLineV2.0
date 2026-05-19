-- Create the outreach_messages table to track prospecting interactions
CREATE TABLE outreach_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, replied, interested, blocked, no_read
  speech_used TEXT,                         -- El texto que se copió
  notes TEXT,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for fast querying
CREATE INDEX idx_outreach_client ON outreach_messages(client_id);
CREATE INDEX idx_outreach_status ON outreach_messages(status);
CREATE INDEX idx_outreach_date ON outreach_messages(created_at);
