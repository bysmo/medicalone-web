import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clinicService } from '../services/api';
import { hasRole, isMissingClinicContext } from '../services/auth';

const ClinicBrandingContext = createContext({
  name: '',
  code: '',
  logoDataUrl: '',
  loading: true,
  refresh: () => {},
});

export const CLINIC_BRANDING_UPDATED = 'clinic-branding-updated';

export function ClinicBrandingProvider({ children }) {
  const [branding, setBranding] = useState({ name: '', code: '', logoDataUrl: '' });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (hasRole('SUPER_ADMIN') || isMissingClinicContext()) {
      setBranding({ name: '', code: '', logoDataUrl: '' });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await clinicService.getBranding();
      const data = res.data || {};
      setBranding({
        name: data.name || '',
        code: data.code || '',
        logoDataUrl: data.logoDataUrl || '',
      });
    } catch {
      setBranding({ name: '', code: '', logoDataUrl: '' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(CLINIC_BRANDING_UPDATED, onUpdate);
    return () => window.removeEventListener(CLINIC_BRANDING_UPDATED, onUpdate);
  }, [refresh]);

  return (
    <ClinicBrandingContext.Provider value={{ ...branding, loading, refresh }}>
      {children}
    </ClinicBrandingContext.Provider>
  );
}

export function useClinicBranding() {
  return useContext(ClinicBrandingContext);
}

export function notifyClinicBrandingUpdated() {
  window.dispatchEvent(new Event(CLINIC_BRANDING_UPDATED));
}
