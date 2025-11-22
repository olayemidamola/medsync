import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertCircle, CheckCircle, Bell, BellOff, Users, Plus, Trash2, Settings } from 'lucide-react';

const MedicationTracker = () => {
  const [medications, setMedications] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAddMed, setShowAddMed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Initialize from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const medsResult = await window.storage.get('medications');
        const careResult = await window.storage.get('caregivers');
        
        if (medsResult?.value) {
          setMedications(JSON.parse(medsResult.value));
        }
        if (careResult?.value) {
          setCaregivers(JSON.parse(careResult.value));
        }
      } catch (error) {
        console.log('Initializing new tracker');
      }
    };
    loadData();
  }, []);

  // Save medications to storage
  const saveMedications = useCallback(async (meds) => {
    try {
      await window.storage.set('medications', JSON.stringify(meds));
    } catch (error) {
      console.error('Failed to save medications:', error);
    }
  }, []);

  // Save caregivers to storage
  const saveCaregivers = useCallback(async (care) => {
    try {
      await window.storage.set('caregivers', JSON.stringify(care));
    } catch (error) {
      console.error('Failed to save caregivers:', error);
    }
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request notification permission
  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  // Send notification
  const sendNotification = (title, body) => {
    if (notificationsEnabled && 'Notification' in window) {
      new Notification(title, { body, icon: '💊' });
    }
  };

  // Check medication status and trigger notifications
  useEffect(() => {
    medications.forEach((med) => {
      med.schedule.forEach((dose, idx) => {
        const doseTime = parseTime(dose.time);
        const timeDiff = (currentTime - doseTime) / (1000 * 60); // minutes
        const doseKey = `${med.id}-${idx}`;
        
        // Check if dose is due (within 1 minute of scheduled time)
        if (timeDiff >= 0 && timeDiff < 1 && dose.status === 'pending') {
          updateDoseStatus(med.id, idx, 'due');
          sendNotification(
            `💊 Medication Due: ${med.name}`,
            `Time to take your ${med.dosage} dose`
          );
        }
        
        // Check if dose is snoozed and snooze expired
        if (dose.status === 'snoozed' && dose.snoozeUntil) {
          const snoozeTime = new Date(dose.snoozeUntil);
          if (currentTime >= snoozeTime) {
            updateDoseStatus(med.id, idx, 'due');
            sendNotification(
              `💊 Snooze Ended: ${med.name}`,
              `Reminder: Time to take your ${med.dosage} dose`
            );
          }
        }
        
        // Check if dose should be marked as MISSED (2 hours past due)
        if (timeDiff >= 120 && (dose.status === 'due' || dose.status === 'snoozed')) {
          updateDoseStatus(med.id, idx, 'missed');
          alertCaregivers(med, dose);
        }
      });
    });
  }, [currentTime, medications]);

  // Parse time string to today's date
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  };

  // Update dose status
  const updateDoseStatus = (medId, doseIdx, status, snoozeUntil = null) => {
    setMedications((prev) => {
      const updated = prev.map((med) => {
        if (med.id === medId) {
          const newSchedule = [...med.schedule];
          newSchedule[doseIdx] = {
            ...newSchedule[doseIdx],
            status,
            snoozeUntil,
            confirmedAt: status === 'taken' ? new Date().toISOString() : null
          };
          return { ...med, schedule: newSchedule };
        }
        return med;
      });
      saveMedications(updated);
      return updated;
    });
  };

  // Handle dose confirmation
  const confirmDose = (medId, doseIdx) => {
    updateDoseStatus(medId, doseIdx, 'taken');
    sendNotification('✅ Dose Confirmed', 'Great job staying on track!');
  };

  // Handle dose snooze
  const snoozeDose = (medId, doseIdx) => {
    const snoozeUntil = new Date(currentTime.getTime() + 5 * 60000);
    updateDoseStatus(medId, doseIdx, 'snoozed', snoozeUntil.toISOString());
    sendNotification('⏳ Dose Snoozed', 'Reminder in 5 minutes');
  };

  // Alert caregivers (simulated - would trigger Cloud Function in production)
  const alertCaregivers = async (med, dose) => {
    console.warn(`🚨 MISSED DOSE ALERT: ${med.name} at ${dose.time}`);
    console.warn('Caregivers to contact:', caregivers);
    
    sendNotification(
      '🚨 MISSED DOSE ALERT',
      `${med.name} was not taken. Caregivers have been notified.`
    );
    
    // In production, trigger Cloud Function to send emails
    // await fetch('/api/alert-caregivers', {
    //   method: 'POST',
    //   body: JSON.stringify({ medication: med, dose, caregivers })
    // });
  };

  // Add new medication
  const addMedication = (medData) => {
    const newMed = {
      id: Date.now().toString(),
      ...medData,
      schedule: medData.times.map((time) => ({
        time,
        status: 'pending',
        snoozeUntil: null,
        confirmedAt: null
      }))
    };
    const updated = [...medications, newMed];
    setMedications(updated);
    saveMedications(updated);
    setShowAddMed(false);
  };

  // Delete medication
  const deleteMedication = (medId) => {
    const updated = medications.filter((m) => m.id !== medId);
    setMedications(updated);
    saveMedications(updated);
  };

  // Add caregiver
  const addCaregiver = (email, name) => {
    const updated = [...caregivers, { id: Date.now().toString(), email, name }];
    setCaregivers(updated);
    saveCaregivers(updated);
  };

  // Delete caregiver
  const deleteCaregiver = (id) => {
    const updated = caregivers.filter((c) => c.id !== id);
    setCaregivers(updated);
    saveCaregivers(updated);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'taken': return 'bg-green-100 text-green-800 border-green-300';
      case 'due': return 'bg-red-100 text-red-800 border-red-300 animate-pulse';
      case 'snoozed': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'missed': return 'bg-gray-800 text-white border-gray-900';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  // Get time until/since dose
  const getTimeDisplay = (dose) => {
    const doseTime = parseTime(dose.time);
    const diff = Math.abs(currentTime - doseTime) / (1000 * 60);
    
    if (dose.status === 'snoozed' && dose.snoozeUntil) {
      const snoozeTime = new Date(dose.snoozeUntil);
      const snoozeDiff = Math.ceil((snoozeTime - currentTime) / (1000 * 60));
      return `Snooze: ${snoozeDiff}m remaining`;
    }
    
    if (currentTime < doseTime) {
      return `In ${Math.ceil(diff)} minutes`;
    } else {
      return `${Math.floor(diff)} minutes ago`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-3 rounded-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">MedSync</h1>
                <p className="text-sm text-gray-500">2-Hour Accountability System</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!notificationsEnabled && (
                <button
                  onClick={enableNotifications}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  Enable Alerts
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Current Time Display */}
          <div className="text-center py-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
            <p className="text-3xl font-bold text-indigo-900">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Accountability Contacts
            </h2>
            
            {caregivers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No caregivers added yet</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {caregivers.map((caregiver) => (
                  <div key={caregiver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{caregiver.name}</p>
                      <p className="text-sm text-gray-600">{caregiver.email}</p>
                    </div>
                    <button
                      onClick={() => deleteCaregiver(caregiver.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <CaregiverForm onAdd={addCaregiver} />
          </div>
        )}

        {/* Add Medication Button */}
        {!showAddMed && (
          <button
            onClick={() => setShowAddMed(true)}
            className="w-full mb-6 p-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add New Medication
          </button>
        )}

        {/* Add Medication Form */}
        {showAddMed && (
          <MedicationForm
            onAdd={addMedication}
            onCancel={() => setShowAddMed(false)}
          />
        )}

        {/* Medications List */}
        {medications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Medications Yet</h3>
            <p className="text-gray-500">Add your first medication to start tracking</p>
          </div>
        ) : (
          <div className="space-y-4">
            {medications.map((med) => (
              <div key={med.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{med.name}</h3>
                      <p className="text-indigo-100">{med.dosage}</p>
                    </div>
                    <button
                      onClick={() => deleteMedication(med.id)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  {med.schedule.map((dose, idx) => (
                    <div
                      key={idx}
                      className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(dose.status)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5" />
                          <div>
                            <p className="font-bold text-lg">{dose.time}</p>
                            <p className="text-xs opacity-75">{getTimeDisplay(dose)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {dose.status === 'taken' && <CheckCircle className="w-5 h-5" />}
                          {dose.status === 'missed' && <AlertCircle className="w-5 h-5" />}
                          {dose.status === 'snoozed' && <BellOff className="w-5 h-5" />}
                          <span className="font-bold text-sm uppercase">{dose.status}</span>
                        </div>
                      </div>
                      
                      {dose.status === 'due' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmDose(med.id, idx)}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Yes (Taken)
                          </button>
                          <button
                            onClick={() => snoozeDose(med.id, idx)}
                            className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Clock className="w-5 h-5" />
                            Not Yet (5m)
                          </button>
                        </div>
                      )}
                      
                      {dose.status === 'snoozed' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmDose(med.id, idx)}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Yes (Taken)
                          </button>
                        </div>
                      )}
                      
                      {dose.status === 'missed' && (
                        <div className="mt-2 p-3 bg-red-900 text-white rounded-lg">
                          <p className="font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Caregivers have been notified
                          </p>
                        </div>
                      )}
                      
                      {dose.confirmedAt && (
                        <p className="text-xs opacity-75 mt-2">
                          Confirmed at {new Date(dose.confirmedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* System Info */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-800 mb-1">2-Hour Accountability Window</p>
              <p>If a dose is not confirmed within 2 hours of its scheduled time, it will be marked as MISSED and all accountability contacts will be alerted immediately.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Medication Form Component
const MedicationForm = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [times, setTimes] = useState(['']);

  const handleSubmit = () => {
    if (name && dosage && times.every((t) => t)) {
      onAdd({ name, dosage, times });
      setName('');
      setDosage('');
      setTimes(['']);
    }
  };

  const addTimeSlot = () => {
    setTimes([...times, '']);
  };

  const updateTime = (idx, value) => {
    const updated = [...times];
    updated[idx] = value;
    setTimes(updated);
  };

  const removeTime = (idx) => {
    setTimes(times.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Medication</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medication Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., Metformin"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dosage
          </label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., 500mg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dose Times
          </label>
          {times.map((time, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="time"
                value={time}
                onChange={(e) => updateTime(idx, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
              {times.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTime(idx)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addTimeSlot}
            className="mt-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Time
          </button>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Add Medication
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Caregiver Form Component
const CaregiverForm = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (name && email) {
      onAdd(email, name);
      setName('');
      setEmail('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Email"
          required
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
};

export default MedicationTracker;