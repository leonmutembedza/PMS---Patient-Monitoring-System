mod clinical;
mod data;
mod engine;
mod models;

use engine::SimulationManager;
use models::{PatientCohortRecord, WardSimulationState};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

// Tauri IPC Commands
#[tauri::command]
fn get_ward_state(sim: State<'_, Arc<SimulationManager>>) -> WardSimulationState {
    sim.get_ward_state()
}

#[tauri::command]
fn get_patient_details(
    patient_id: String,
    sim: State<'_, Arc<SimulationManager>>,
) -> Option<PatientCohortRecord> {
    let state = sim.inner.lock().unwrap();
    state.cohort.iter().find(|p| p.id == patient_id).cloned()
}

#[tauri::command]
fn set_playback(
    is_playing: bool,
    speed: i32,
    sim: State<'_, Arc<SimulationManager>>,
) -> WardSimulationState {
    sim.set_playback(is_playing, speed)
}

#[tauri::command]
fn scrub_time(target_minute: i32, sim: State<'_, Arc<SimulationManager>>) -> WardSimulationState {
    sim.scrub_time(target_minute)
}

#[tauri::command]
fn acknowledge_alert(
    alert_id: String,
    sim: State<'_, Arc<SimulationManager>>,
) -> WardSimulationState {
    sim.acknowledge_alert(&alert_id)
}

#[tauri::command]
fn snooze_alert(
    alert_id: String,
    minutes: i32,
    sim: State<'_, Arc<SimulationManager>>,
) -> WardSimulationState {
    sim.snooze_alert(&alert_id, minutes)
}

#[tauri::command]
fn simulation_tick(
    delta_minutes: i32,
    sim: State<'_, Arc<SimulationManager>>,
) -> WardSimulationState {
    sim.tick(delta_minutes)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sim_manager = Arc::new(SimulationManager::new());
    let sim_for_bg = Arc::clone(&sim_manager);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(sim_manager)
        .setup(move |app| {
            let handle: AppHandle = app.handle().clone();
            // Background real-time simulation tick thread (pushes state via window.emit every 1 sec)
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_millis(1000));
                    let updated_state = sim_for_bg.tick(1);
                    let _ = handle.emit("simulation-update", &updated_state);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ward_state,
            get_patient_details,
            set_playback,
            scrub_time,
            acknowledge_alert,
            snooze_alert,
            simulation_tick
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
