-- Add order column to user_widget_settings
-- This migration is designed to be safely re-runnable.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_widget_settings'
        AND column_name = 'widget_order'
    ) THEN
        ALTER TABLE public.user_widget_settings
        ADD COLUMN widget_order INT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Update function to get widget settings for a user, ensuring defaults and order are provided.
CREATE OR REPLACE FUNCTION public.get_user_widget_settings()
RETURNS TABLE(widget_id text, is_visible boolean, widget_order int)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- This CTE defines the master list of widgets and their default order.
    -- It's the single source of truth for available widgets.
    RETURN QUERY
    WITH default_widgets (id, "order") AS (
        VALUES
            ('cash_bank', 0),
            ('debt', 1),
            ('plan_fact', 2),
            ('inventory', 3)
    )
    SELECT
        dw.id,
        COALESCE(uws.is_visible, TRUE) as is_visible,
        COALESCE(uws.widget_order, dw.order) as widget_order
    FROM default_widgets dw
    LEFT JOIN public.user_widget_settings uws ON uws.widget_id = dw.id AND uws.user_id = v_user_id
    ORDER BY widget_order;
END;
$$;

-- Function to save the reordered widgets for a user
CREATE OR REPLACE FUNCTION public.save_widget_order(p_widget_orders jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    widget_data jsonb;
    v_user_id UUID := auth.uid();
BEGIN
    -- This loop iterates through the provided JSON array of widgets and their new order.
    FOR widget_data IN SELECT * FROM jsonb_array_elements(p_widget_orders)
    LOOP
        -- Upsert ensures that a setting row exists for the user and widget.
        INSERT INTO public.user_widget_settings (user_id, widget_id, widget_order)
        VALUES (
            v_user_id,
            widget_data->>'widget_id',
            (widget_data->>'order')::int
        )
        ON CONFLICT (user_id, widget_id)
        DO UPDATE SET
            widget_order = EXCLUDED.widget_order,
            updated_at = NOW(); -- Keep the timestamp fresh
    END LOOP;
END;
$$;