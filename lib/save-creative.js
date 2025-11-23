/**
 * Сохранение креатива в Supabase с минимальной структурой (4 поля)
 * Для использования вторым агентом (интерфейс на базе конкурентов)
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL || 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Сохраняет креатив в Supabase с минимальной структурой
 * @param {Object} rowData - Данные строки из Google Sheets или другой источник
 * @returns {Promise<{success: boolean, action: 'created'|'updated'|'error', message: string}>}
 */
async function saveCreative(rowData) {
  try {
    // Минимальная структура для второго агента (только 4 поля)
    const record = {
      image_url: rowData['Image URL'] || rowData['Preview URL'] || rowData.image_url,  // ОБЯЗАТЕЛЬНО: ссылка на превью
      competitor_name: rowData['Advertiser Name'] || rowData['Competitor'] || rowData.competitor_name || 'Unknown',  // Название конкурента
      active_days: parseInt(rowData['Active Days'] || rowData.active_days || 0),      // Количество дней (INTEGER)
      ad_id: rowData['Ad ID'] || rowData['ID'] || rowData.ad_id || null,             // ID креатива (уникальный идентификатор)
    };

    // Проверяем обязательное поле
    if (!record.image_url) {
      return {
        success: false,
        action: 'error',
        message: 'image_url is required'
      };
    }

    // Проверяем существование: сначала по ad_id (если есть), затем по image_url
    let existing = null;
    let identifierField = null;
    let identifierValue = null;

    if (record.ad_id) {
      // Проверяем по ad_id (приоритет)
      identifierField = 'ad_id';
      identifierValue = record.ad_id;
      const { data: existingByAdId, error: checkByAdId } = await supabase
        .from('competitor_creatives')
        .select('id')
        .eq('ad_id', record.ad_id)
        .single();
      
      if (!checkByAdId || checkByAdId.code === 'PGRST116') {
        existing = existingByAdId;
      }
    }

    // Если не нашли по ad_id, проверяем по image_url
    if (!existing) {
      identifierField = 'image_url';
      identifierValue = record.image_url;
      const { data: existingByImage, error: checkByImage } = await supabase
        .from('competitor_creatives')
        .select('id')
        .eq('image_url', record.image_url)
        .single();
      
      if (checkByImage && checkByImage.code !== 'PGRST116') {
        return {
          success: false,
          action: 'error',
          message: `Error checking ${identifierValue}: ${checkByImage.message}`
        };
      }
      existing = existingByImage;
    }

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('competitor_creatives')
        .update(record)
        .eq('id', existing.id);

      if (updateError) {
        return {
          success: false,
          action: 'error',
          message: `Error updating ${identifierValue}: ${updateError.message}`
        };
      }

      return {
        success: true,
        action: 'updated',
        message: `Updated: ${identifierValue}`
      };
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from('competitor_creatives')
        .insert(record);

      if (insertError) {
        return {
          success: false,
          action: 'error',
          message: `Error inserting ${identifierValue}: ${insertError.message}`
        };
      }

      return {
        success: true,
        action: 'created',
        message: `Created: ${identifierValue}`
      };
    }
  } catch (error) {
    return {
      success: false,
      action: 'error',
      message: error.message
    };
  }
}

module.exports = { saveCreative };

