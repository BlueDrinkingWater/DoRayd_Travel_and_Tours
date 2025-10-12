import { useState, useEffect, useCallback } from 'react';

export const useApi = (apiFunction, dependencies = [], options = {}) => {
  const { immediate = true, onSuccess, onError } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (...args) => {
    if (typeof apiFunction !== 'function') {
      const err = new TypeError('apiFunction is not a function');
      setError(err);
      setLoading(false);
      throw err;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await apiFunction(...args);
      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError]);
  
  useEffect(() => {
    if (immediate) {
      execute().catch(err => {
        // Prevent unhandled promise rejection in console
      });
    }
  }, [...dependencies, immediate]);
  
  return {
    data,
    loading,
    error,
    execute,
    refetch: execute
  };
};

export default useApi;