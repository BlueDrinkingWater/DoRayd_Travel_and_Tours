import { useState, useEffect, useCallback } from 'react';
import DataService from '../components/services/DataService';

export const useApi = (apiFunction, dependencies = [], options = {}) => {
  const { immediate = true, onSuccess, onError } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (...args) => {
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
      console.error('API Error:', err);
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
        console.error('Failed to fetch data on mount:', err);
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

// Specific hooks for different data types
export const useCars = (filters = {}) => {
  return useApi(
    () => DataService.fetchAllCars(filters),
    [JSON.stringify(filters)],
    {
      onSuccess: (data) => {
        console.log(`✅ Fetched ${data?.data?.length || 0} cars at ${new Date().toLocaleString()}`);
      }
    }
  );
};

export const useTours = (filters = {}) => {
  return useApi(
    () => DataService.fetchAllTours(filters),
    [JSON.stringify(filters)],
    {
      onSuccess: (data) => {
        console.log(`✅ Fetched ${data?.data?.length || 0} tours at ${new Date().toLocaleString()}`);
      }
    }
  );
};

export const useBookings = (filters = {}) => {
  return useApi(
    () => DataService.fetchAllBookings(filters),
    [JSON.stringify(filters)],
    {
      immediate: false, // Requires authentication
      onSuccess: (data) => {
        console.log(`✅ Fetched ${data?.data?.length || 0} bookings at ${new Date().toLocaleString()}`);
      }
    }
  );
};

export const useAnalytics = () => {
  return useApi(
    () => DataService.fetchDashboardAnalytics(),
    [],
    {
      immediate: false, // Requires authentication
      onSuccess: (data) => {
        console.log(`✅ Fetched analytics at ${new Date().toLocaleString()}`);
      }
    }
  );
};

export const useMessages = (filters = {}) => {
  return useApi(
    () => DataService.fetchAllMessages(filters),
    [JSON.stringify(filters)],
    {
      immediate: false, // Requires authentication
      onSuccess: (data) => {
        console.log(`✅ Fetched ${data?.data?.length || 0} messages at ${new Date().toLocaleString()}`);
      }
    }
  );
};

export const useEmployees = () => {
  return useApi(
    () => DataService.fetchAllEmployees(),
    [],
    {
      immediate: false, // Requires admin authentication
      onSuccess: (data) => {
        console.log(`✅ Fetched ${data?.data?.length || 0} employees at ${new Date().toLocaleString()}`);
      }
    }
  );
};

export const useSearch = (query, type = 'all') => {
    return useApi(
        () => DataService.searchItems(query, type),
        [query, type],
        {
            immediate: !!query,
            onSuccess: (data) => {
                console.log(`✅ Search for "${query}" completed at ${new Date().toLocaleString()}`);
            }
        }
    );
};


export default useApi;