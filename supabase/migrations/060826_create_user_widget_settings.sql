-- Table to store user-specific widget visibility settings
CREATE TABLE public.user_widget_settings (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    widget_id TEXT NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, widget_id)
);

-- Enable RLS
ALTER TABLE public.user_widget_settings ENABLE ROW LEVEL SECURITY;

-- Policies for user_widget_settings
CREATE POLICY "Users can manage their own widget settings"
ON public.user_widget_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_user_widget_settings_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_widget_settings_update
BEFORE UPDATE ON public.user_widget_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_widget_settings_update();

-- Function to get widget settings for a user, ensuring defaults are provided.
CREATE OR REPLACE FUNCTION public.get_user_widget_settings()
RETURNS TABLE(widget_id text, is_visible boolean)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    -- Define all available widgets here
    all_widgets TEXT[] := ARRAY['cash_bank', 'debt', 'plan_fact', 'inventory'];
BEGIN
    RETURN QUERY
    SELECT
        u.widget,
        COALESCE(uws.is_visible, TRUE) AS is_visible
    FROM unnest(all_widgets) AS u(widget)
    LEFT JOIN public.user_widget_settings uws ON uws.widget_id = u.widget AND uws.user_id = v_user_id;
END;
$$;