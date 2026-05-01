import subprocess
import argparse
import sys
from pathlib import Path
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("batch_runner")

DEFAULT_CITIES = [
    "Guadalajara",
    "Puebla",
    "Tijuana",
    "Chihuahua",
    "San Luis Potosí",
    "Saltillo",
    "Aguascalientes",
    "Mazatlán",
    "Puerto Vallarta",
    "Ciudad Juárez",
    "Mexicali",
    "Culiacán",
    "Veracruz",
    "Morelia",
    "Pachuca"
]

def run_batch(cities, provider, audit, max_results, dry_run=False):
    for city in cities:
        logger.info(f"Starting pipeline for city: {city}")
        
        cmd = [
            sys.executable, "src/run_pipeline.py",
            "--city", city,
            "--provider", provider,
            "--max-results", str(max_results)
        ]
        if audit:
            cmd.append("--audit")
            
        logger.info(f"Command: {' '.join(cmd)}")
        
        if dry_run:
            logger.info(f"Dry run: skipping execution for {city}")
            continue
            
        log_file = Path("logs") / f"{city.lower().replace(' ', '_')}_run.log"
        log_file.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(log_file, "w") as f:
                process = subprocess.Popen(
                    cmd,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    text=True
                )
                logger.info(f"Process started (PID: {process.pid}). Logging to {log_file}")
                process.wait()
                
            if process.returncode == 0:
                logger.info(f"Successfully completed pipeline for {city}")
            else:
                logger.error(f"Pipeline failed for {city} with return code {process.returncode}")
        except Exception as e:
            logger.error(f"Error running pipeline for {city}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run pipeline for multiple cities")
    parser.add_argument("--cities", type=str, help="Comma-separated list of cities")
    parser.add_argument("--provider", choices=["mock", "real"], default="real")
    parser.add_argument("--audit", action="store_true", default=True)
    parser.add_argument("--max-results", type=int, default=20)
    parser.add_argument("--dry-run", action="store_true")
    
    args = parser.parse_args()
    
    if args.cities:
        city_list = [c.strip() for c in args.cities.split(",")]
    else:
        city_list = DEFAULT_CITIES
        
    run_batch(city_list, args.provider, args.audit, args.max_results, args.dry_run)
