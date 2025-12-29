import subprocess
import os

# Path to the mimi CLI
MIMI_CLI_PATH = os.path.join(os.getcwd(), 'bin', 'mimi')

def get_memory_protocol():
    """
    Calls 'mimi instruction' to get the mandatory memory protocol.
    """
    try:
        # Use the mimi executable directly
        cmd = [MIMI_CLI_PATH, 'instruction']
        
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error retrieving memory protocol: {e}")
        return ""
    except Exception as e:
        print(f"Unexpected error: {e}")
        return ""

def configure_session_hook(session_config):
    """
    Hook to be called when initializing a Google Gemini CLI session.
    Injects the memory protocol into the system instruction.
    """
    print(" [Hook] Retrieving mimi-memory protocol...")
    protocol = get_memory_protocol()
    
    if protocol:
        print(" [Hook] Protocol retrieved. Injecting into system instruction.")
        # Append to existing system instruction
        current_instruction = session_config.get('system_instruction', '')
        session_config['system_instruction'] = f"{current_instruction}\n\n{protocol}"
    else:
        print(" [Hook] Warning: Failed to retrieve protocol.")

    return session_config

# --- Simulation of the User's provided 'Gemini' session setup ---
if __name__ == "__main__":
    # Mock configuration object similar to what might be passed to create_session
    gemini_config = {
        "model": "gemini-2.0-flash",
        "system_instruction": "You are a helpful AI assistant."
    }

    print("--- Before Hook ---")
    print(gemini_config['system_instruction'])
    
    # Apply the hook
    gemini_config = configure_session_hook(gemini_config)
    
    print("\n--- After Hook (Ready for Session) ---")
    print(gemini_config['system_instruction'])
